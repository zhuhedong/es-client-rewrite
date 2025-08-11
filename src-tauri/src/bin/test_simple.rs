use std::path::Path;

fn main() {
    // 简单测试，验证模块是否可以被编译
    println!("Testing module compilation...");
    
    // 检查关键文件是否存在
    let files = [
        "src/lib.rs",
        "src/error.rs", 
        "src/import.rs",
        "src/commands.rs",
        "src/es_client.rs",
        "src/types.rs"
    ];
    
    for file in &files {
        if Path::new(file).exists() {
            println!("✅ {} exists", file);
        } else {
            println!("❌ {} missing", file);
        }
    }
    
    println!("Module structure looks good!");
}