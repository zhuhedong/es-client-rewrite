use crate::types::*;
use anyhow::{Context, Result};
use csv::Reader;
use serde_json::{Map, Value};
use std::fs::File;
use std::io::{BufRead, BufReader};
use tracing::{debug, error, warn};

pub struct ImportService {}

impl ImportService {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn import_data(&self, request: &ImportRequest, client: &crate::es_client::EsClient) -> Result<ImportResult> {
        debug!("Starting data import for index: {}", request.index);

        // 如果需要创建索引，先创建
        if request.create_index {
            if let Some(mapping) = &request.mapping {
                debug!("Creating index with mapping: {}", request.index);
                if let Err(e) = client.create_index(&request.index, Some(mapping.clone())).await {
                    warn!("Failed to create index (may already exist): {}", e);
                }
            } else {
                debug!("Creating index without mapping: {}", request.index);
                if let Err(e) = client.create_index(&request.index, None).await {
                    warn!("Failed to create index (may already exist): {}", e);
                }
            }
        }

        let documents = match request.format {
            ImportFormat::JSON => self.parse_json_file(&request.file_path)?,
            ImportFormat::CSV => self.parse_csv_file(&request.file_path)?,
        };

        debug!("Parsed {} documents from file", documents.len());

        let batch_size = request.batch_size.unwrap_or(1000) as usize;
        let mut total_processed = 0u64;
        let mut successful_imports = 0u64;
        let mut failed_imports = 0u64;
        let mut errors = Vec::new();

        // 批量处理文档
        for (chunk_idx, chunk) in documents.chunks(batch_size).enumerate() {
            let mut operations = Vec::new();

            for (doc_idx, document) in chunk.iter().enumerate() {
                let line_number = (chunk_idx * batch_size + doc_idx + 1) as u64;
                total_processed += 1;

                let doc_id = if let Some(id_field) = &request.id_field {
                    document.get(id_field).and_then(|v| v.as_str()).map(|s| s.to_string())
                } else {
                    None
                };

                let action = if request.overwrite_existing { "index" } else { "create" };

                let operation = BulkOperation {
                    action: action.to_string(),
                    index: request.index.clone(),
                    id: doc_id,
                    document: Some(document.clone()),
                };

                operations.push(operation);
            }

            let bulk_request = BulkRequest { operations };

            match client.bulk_operations(&bulk_request).await {
                Ok(response) => {
                    // 处理批量响应
                    for (idx, item) in response.items.iter().enumerate() {
                        let line_number = (chunk_idx * batch_size + idx + 1) as u64;

                        if let Some(item_obj) = item.as_object() {
                            let mut has_error = false;
                            for (action, result) in item_obj {
                                if let Some(result_obj) = result.as_object() {
                                    if result_obj.contains_key("error") {
                                        has_error = true;
                                        let error_msg = result_obj
                                            .get("error")
                                            .and_then(|e| e.get("reason"))
                                            .and_then(|r| r.as_str())
                                            .unwrap_or("Unknown error")
                                            .to_string();

                                        errors.push(ImportError {
                                            line_number,
                                            error_message: error_msg,
                                            document: chunk.get(idx).cloned(),
                                        });
                                        failed_imports += 1;
                                    }
                                }
                            }

                            if !has_error {
                                successful_imports += 1;
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Bulk operation failed: {}", e);
                    // 将整个批次标记为失败
                    for (idx, document) in chunk.iter().enumerate() {
                        let line_number = (chunk_idx * batch_size + idx + 1) as u64;
                        errors.push(ImportError {
                            line_number,
                            error_message: format!("Bulk operation failed: {}", e),
                            document: Some(document.clone()),
                        });
                        failed_imports += 1;
                    }
                }
            }
        }

        let success = failed_imports == 0;
        let message = if success {
            format!("Successfully imported {} documents", successful_imports)
        } else {
            format!("Imported {} documents with {} errors", successful_imports, failed_imports)
        };

        Ok(ImportResult {
            success,
            total_processed,
            successful_imports,
            failed_imports,
            errors,
            message,
        })
    }

    fn parse_json_file(&self, file_path: &str) -> Result<Vec<Value>> {
        let file = File::open(file_path)
            .with_context(|| format!("Failed to open file: {}", file_path))?;
        let reader = BufReader::new(file);
        let mut documents = Vec::new();

        for (line_num, line) in reader.lines().enumerate() {
            let line = line.with_context(|| format!("Failed to read line {}", line_num + 1))?;
            let line = line.trim();
            
            if line.is_empty() {
                continue;
            }

            let document: Value = serde_json::from_str(&line)
                .with_context(|| format!("Failed to parse JSON on line {}", line_num + 1))?;
            
            documents.push(document);
        }

        Ok(documents)
    }

    fn parse_csv_file(&self, file_path: &str) -> Result<Vec<Value>> {
        let file = File::open(file_path)
            .with_context(|| format!("Failed to open file: {}", file_path))?;
        
        let mut reader = Reader::from_reader(file);
        let headers = reader.headers()?.clone();
        let mut documents = Vec::new();

        for result in reader.records() {
            let record = result.with_context(|| "Failed to read CSV record")?;
            let mut document = Map::new();

            for (i, field) in record.iter().enumerate() {
                if let Some(header) = headers.get(i) {
                    // 尝试解析为数字或布尔值，否则作为字符串
                    let value = if field.is_empty() {
                        Value::Null
                    } else if let Ok(num) = field.parse::<i64>() {
                        Value::Number(serde_json::Number::from(num))
                    } else if let Ok(num) = field.parse::<f64>() {
                        if let Some(num) = serde_json::Number::from_f64(num) {
                            Value::Number(num)
                        } else {
                            Value::String(field.to_string())
                        }
                    } else if field.eq_ignore_ascii_case("true") {
                        Value::Bool(true)
                    } else if field.eq_ignore_ascii_case("false") {
                        Value::Bool(false)
                    } else {
                        Value::String(field.to_string())
                    };

                    document.insert(header.to_string(), value);
                }
            }

            documents.push(Value::Object(document));
        }

        Ok(documents)
    }
}