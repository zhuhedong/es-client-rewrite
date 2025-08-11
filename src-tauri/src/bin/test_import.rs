use std::fs::File;
use std::io::Write;
use serde_json::Value;
use csv::Reader;

fn main() {
    // Test JSON parsing logic
    println!("Testing JSON file parsing...");
    
    let json_content = r#"[
  {"id": 1, "name": "Alice", "age": 30, "city": "New York"},
  {"id": 2, "name": "Bob", "age": 25, "city": "Los Angeles"}
]"#;
    
    match serde_json::from_str::<Vec<Value>>(json_content) {
        Ok(documents) => {
            println!("✅ JSON parsing successful! Found {} documents", documents.len());
            for (i, doc) in documents.iter().enumerate() {
                println!("  Document {}: {:?}", i + 1, doc);
            }
        }
        Err(e) => {
            println!("❌ JSON parsing failed: {}", e);
        }
    }
    
    // Test CSV parsing logic
    println!("\nTesting CSV file parsing...");
    
    let csv_content = "id,name,age,city\n1,Alice,30,New York\n2,Bob,25,Los Angeles";
    let mut reader = Reader::from_reader(csv_content.as_bytes());
    
    let headers = reader.headers().unwrap().clone();
    println!("CSV headers: {:?}", headers);
    
    let mut documents = Vec::new();
    for result in reader.records() {
        match result {
            Ok(record) => {
                let mut document = serde_json::Map::new();
                for (i, field) in record.iter().enumerate() {
                    if let Some(header) = headers.get(i) {
                        let value = if field.is_empty() {
                            Value::Null
                        } else if let Ok(num) = field.parse::<i64>() {
                            Value::Number(serde_json::Number::from(num))
                        } else {
                            Value::String(field.to_string())
                        };
                        document.insert(header.to_string(), value);
                    }
                }
                documents.push(Value::Object(document));
            }
            Err(e) => {
                println!("❌ CSV record parsing failed: {}", e);
            }
        }
    }
    
    println!("✅ CSV parsing successful! Found {} documents", documents.len());
    for (i, doc) in documents.iter().enumerate() {
        println!("  Document {}: {:?}", i + 1, doc);
    }
}