use crate::types::{ExportFormat, ExportRequest, ExportResult};
use anyhow::{anyhow, Result};
use csv::WriterBuilder;
use serde_json::Value;
use std::fs::{create_dir_all, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use rust_xlsxwriter::{Workbook, Format};

pub struct ExportService;

impl ExportService {
    pub fn new() -> Self {
        Self
    }

    pub async fn export_data(&self, request: ExportRequest, data: Vec<Value>) -> Result<ExportResult> {
        // 创建导出目录
        let export_dir = self.get_export_directory()?;
        create_dir_all(&export_dir)?;

        // 生成文件路径
        let file_path = export_dir.join(&request.filename);
        
        // 限制导出记录数量
        let max_records = request.max_records.unwrap_or(10000) as usize;
        let limited_data: Vec<Value> = data.into_iter().take(max_records).collect();
        let total_records = limited_data.len() as u64;

        // 根据格式导出
        match request.format {
            ExportFormat::JSON => self.export_json(&file_path, &limited_data, &request.selected_fields)?,
            ExportFormat::CSV => self.export_csv(&file_path, &limited_data, &request.selected_fields)?,
            ExportFormat::Excel => self.export_excel(&file_path, &limited_data, &request.selected_fields)?,
        }

        Ok(ExportResult {
            success: true,
            file_path: file_path.to_string_lossy().to_string(),
            total_records,
            message: format!("成功导出 {} 条记录到 {}", total_records, request.filename),
        })
    }

    pub fn get_export_directory(&self) -> Result<PathBuf> {
        let home_dir = dirs::home_dir().ok_or_else(|| anyhow!("无法获取用户主目录"))?;
        Ok(home_dir.join("Documents").join("ES_Client_Exports"))
    }

    fn export_json(&self, file_path: &Path, data: &[Value], selected_fields: &Option<Vec<String>>) -> Result<()> {
        let file = File::create(file_path)?;
        let writer = BufWriter::new(file);

        if let Some(fields) = selected_fields {
            // 只导出选中的字段
            let filtered_data: Vec<Value> = data.iter()
                .map(|doc| self.filter_fields(doc, fields))
                .collect();
            serde_json::to_writer_pretty(writer, &filtered_data)?;
        } else {
            // 导出所有数据
            serde_json::to_writer_pretty(writer, data)?;
        }

        Ok(())
    }

    fn export_csv(&self, file_path: &Path, data: &[Value], selected_fields: &Option<Vec<String>>) -> Result<()> {
        if data.is_empty() {
            return Err(anyhow!("没有数据可以导出"));
        }

        let file = File::create(file_path)?;
        let mut writer = WriterBuilder::new().from_writer(file);

        // 提取字段名
        let headers = if let Some(fields) = selected_fields {
            fields.clone()
        } else {
            self.extract_all_fields(data)
        };

        // 写入表头
        writer.write_record(&headers)?;

        // 写入数据行
        for doc in data {
            let mut row = Vec::new();
            for header in &headers {
                let value = self.get_nested_field(doc, header);
                row.push(self.value_to_string(&value));
            }
            writer.write_record(&row)?;
        }

        writer.flush()?;
        Ok(())
    }

    fn export_excel(&self, file_path: &Path, data: &[Value], selected_fields: &Option<Vec<String>>) -> Result<()> {
        if data.is_empty() {
            return Err(anyhow!("没有数据可以导出"));
        }

        let mut workbook = Workbook::new();
        let worksheet = workbook.add_worksheet();

        // 提取字段名
        let headers = if let Some(fields) = selected_fields {
            fields.clone()
        } else {
            self.extract_all_fields(data)
        };

        // 创建表头格式
        let header_format = Format::new().set_bold();

        // 写入表头
        for (col, header) in headers.iter().enumerate() {
            worksheet.write_string_with_format(0, col as u16, header, &header_format)?;
        }

        // 写入数据
        for (row_idx, doc) in data.iter().enumerate() {
            for (col_idx, header) in headers.iter().enumerate() {
                let value = self.get_nested_field(doc, header);
                let cell_value = self.value_to_string(&value);
                worksheet.write_string((row_idx + 1) as u32, col_idx as u16, &cell_value)?;
            }
        }

        // 自动调整列宽
        for col in 0..headers.len() {
            worksheet.set_column_width(col as u16, 15.0)?;
        }

        workbook.save(file_path)?;
        Ok(())
    }

    fn filter_fields(&self, doc: &Value, fields: &[String]) -> Value {
        let mut filtered = serde_json::Map::new();
        
        if let Some(source) = doc.get("_source").and_then(|v| v.as_object()) {
            for field in fields {
                if let Some(value) = source.get(field) {
                    filtered.insert(field.clone(), value.clone());
                }
            }
        }

        // 保留基础信息
        if let Some(id) = doc.get("_id") {
            filtered.insert("_id".to_string(), id.clone());
        }
        if let Some(score) = doc.get("_score") {
            filtered.insert("_score".to_string(), score.clone());
        }

        Value::Object(filtered)
    }

    fn extract_all_fields(&self, data: &[Value]) -> Vec<String> {
        let mut fields_set = std::collections::HashSet::new();
        
        // 遍历所有文档收集字段名
        for doc in data.iter().take(10) { // 只检查前10个文档以提高性能
            if let Some(source) = doc.get("_source").and_then(|v| v.as_object()) {
                for key in source.keys() {
                    fields_set.insert(key.clone());
                }
            }
        }

        let mut fields: Vec<String> = fields_set.into_iter().collect();
        fields.sort();

        // 添加基础字段
        let mut result = vec!["_id".to_string(), "_score".to_string()];
        result.extend(fields);
        result
    }

    fn get_nested_field(&self, doc: &Value, field_path: &str) -> Value {
        // 处理嵌套字段，如 "user.name"
        let parts: Vec<&str> = field_path.split('.').collect();
        let mut current = doc;

        // 首先尝试从 _source 中获取
        if let Some(source) = doc.get("_source") {
            current = source;
        }

        // 如果是基础字段，直接从根级别获取
        if parts.len() == 1 && (field_path == "_id" || field_path == "_score" || field_path == "_index") {
            return doc.get(field_path).unwrap_or(&Value::Null).clone();
        }

        // 遍历嵌套路径
        for part in parts {
            match current.get(part) {
                Some(value) => current = value,
                None => return Value::Null,
            }
        }

        current.clone()
    }

    fn value_to_string(&self, value: &Value) -> String {
        match value {
            Value::Null => String::new(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => n.to_string(),
            Value::String(s) => s.clone(),
            Value::Array(_) | Value::Object(_) => {
                // 对于复杂对象，转换为JSON字符串
                serde_json::to_string(value).unwrap_or_else(|_| "[Complex Object]".to_string())
            }
        }
    }
}