// 简单的测试文件来验证我们的代码修复
use std::collections::HashMap;

mod types;
mod error;
mod import;
mod export;
mod es_client;
mod commands;
mod crypto;

use error::ErrorDetails;
use import::ImportService;

fn main() {
    println!("测试导入成功！");
    
    // 测试错误模块
    let error = ErrorDetails::connection_failed("http://localhost:9200", None);
    println!("错误测试: {}", error);
    
    // 测试导入服务
    let _service = ImportService::new();
    println!("导入服务创建成功！");
    
    println!("所有模块导入正常，编译错误已修复！");
}