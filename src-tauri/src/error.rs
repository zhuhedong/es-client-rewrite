use serde::{Deserialize, Serialize};
use std::fmt;
use std::error::Error as StdError;
use anyhow::Error as AnyhowError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetails {
    pub error_type: ErrorType,
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub suggestion: Option<String>,
    pub recoverable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorType {
    Connection,
    Authentication,
    Network,
    Validation,
    NotFound,
    ServerError,
    Timeout,
    RateLimited,
    Conflict,
    Forbidden,
    UnknownError,
}

impl ErrorDetails {
    pub fn connection_failed(url: &str, details: Option<String>) -> Self {
        Self {
            error_type: ErrorType::Connection,
            code: "CONNECTION_FAILED".to_string(),
            message: format!("无法连接到 Elasticsearch 服务器 {}", url),
            details,
            suggestion: Some("请检查服务器地址和网络连接，确保 Elasticsearch 服务正在运行".to_string()),
            recoverable: true,
        }
    }

    pub fn authentication_failed(username: &str) -> Self {
        Self {
            error_type: ErrorType::Authentication,
            code: "AUTH_FAILED".to_string(),
            message: format!("用户 {} 认证失败", username),
            details: None,
            suggestion: Some("请检查用户名和密码是否正确".to_string()),
            recoverable: true,
        }
    }

    pub fn index_not_found(index: &str) -> Self {
        Self {
            error_type: ErrorType::NotFound,
            code: "INDEX_NOT_FOUND".to_string(),
            message: format!("索引 '{}' 不存在", index),
            details: None,
            suggestion: Some("请确认索引名称正确，或先创建该索引".to_string()),
            recoverable: false,
        }
    }

    pub fn query_syntax_error(details: String) -> Self {
        Self {
            error_type: ErrorType::Validation,
            code: "QUERY_SYNTAX_ERROR".to_string(),
            message: "查询语法错误".to_string(),
            details: Some(details),
            suggestion: Some("请检查 DSL 查询语法，确保符合 Elasticsearch 规范".to_string()),
            recoverable: true,
        }
    }

    pub fn server_error(status: u16, body: String) -> Self {
        let (code, message, suggestion) = match status {
            400 => (
                "BAD_REQUEST",
                "请求参数错误".to_string(),
                "请检查请求参数的格式和内容"
            ),
            401 => (
                "UNAUTHORIZED",
                "未授权访问".to_string(),
                "请检查认证信息或重新登录"
            ),
            403 => (
                "FORBIDDEN",
                "权限不足".to_string(),
                "当前用户没有执行此操作的权限"
            ),
            404 => (
                "NOT_FOUND",
                "资源不存在".to_string(),
                "请确认资源路径和名称是否正确"
            ),
            409 => (
                "CONFLICT",
                "资源冲突".to_string(),
                "资源已存在或操作冲突，请检查后重试"
            ),
            429 => (
                "RATE_LIMITED",
                "请求频率过高".to_string(),
                "请稍后重试，或调整请求频率"
            ),
            500..=599 => (
                "SERVER_ERROR",
                "服务器内部错误".to_string(),
                "请稍后重试，如果问题持续请联系管理员"
            ),
            _ => (
                "HTTP_ERROR",
                format!("HTTP 错误 {}", status),
                "请检查请求或稍后重试"
            ),
        };

        let error_type = match status {
            401 => ErrorType::Authentication,
            403 => ErrorType::Forbidden,
            404 => ErrorType::NotFound,
            409 => ErrorType::Conflict,
            429 => ErrorType::RateLimited,
            500..=599 => ErrorType::ServerError,
            _ => ErrorType::UnknownError,
        };

        Self {
            error_type,
            code: code.to_string(),
            message: message.to_string(),
            details: if body.is_empty() { None } else { Some(body) },
            suggestion: Some(suggestion.to_string()),
            recoverable: matches!(status, 429 | 500..=599),
        }
    }

    pub fn timeout_error(operation: &str, timeout_ms: u64) -> Self {
        Self {
            error_type: ErrorType::Timeout,
            code: "OPERATION_TIMEOUT".to_string(),
            message: format!("{}操作超时", operation),
            details: Some(format!("操作在 {}ms 内未完成", timeout_ms)),
            suggestion: Some("请尝试增加超时时间或简化查询条件".to_string()),
            recoverable: true,
        }
    }

    pub fn network_error(details: String) -> Self {
        Self {
            error_type: ErrorType::Network,
            code: "NETWORK_ERROR".to_string(),
            message: "网络连接错误".to_string(),
            details: Some(details),
            suggestion: Some("请检查网络连接状态和防火墙设置".to_string()),
            recoverable: true,
        }
    }

    pub fn validation_error(field: &str, message: &str) -> Self {
        Self {
            error_type: ErrorType::Validation,
            code: "VALIDATION_ERROR".to_string(),
            message: format!("字段 '{}' 验证失败: {}", field, message),
            details: None,
            suggestion: Some("请检查输入内容的格式和有效性".to_string()),
            recoverable: true,
        }
    }

    pub fn from_anyhow_error(error: AnyhowError) -> Self {
        let error_str = error.to_string();
        
        // 尝试从错误信息中识别错误类型
        if error_str.contains("Connection refused") || error_str.contains("connection failed") {
            Self::connection_failed("", Some(error_str))
        } else if error_str.contains("timeout") {
            Self::timeout_error("请求", 30000)
        } else if error_str.contains("JSON") || error_str.contains("parse") {
            Self::validation_error("JSON", &error_str)
        } else if error_str.contains("authentication") || error_str.contains("401") {
            Self::authentication_failed("")
        } else {
            Self {
                error_type: ErrorType::UnknownError,
                code: "UNKNOWN_ERROR".to_string(),
                message: "操作失败".to_string(),
                details: Some(error_str),
                suggestion: Some("请查看详细错误信息，或联系管理员".to_string()),
                recoverable: false,
            }
        }
    }
}

impl fmt::Display for ErrorDetails {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)?;
        if let Some(details) = &self.details {
            write!(f, ": {}", details)?;
        }
        Ok(())
    }
}

impl StdError for ErrorDetails {}

impl From<AnyhowError> for ErrorDetails {
    fn from(error: AnyhowError) -> Self {
        Self::from_anyhow_error(error)
    }
}

// HTTP 状态码解析辅助函数
pub fn parse_http_error(status: u16, body: &str) -> ErrorDetails {
    // 尝试解析 Elasticsearch 的错误响应
    if let Ok(es_error) = serde_json::from_str::<serde_json::Value>(body) {
        if let Some(error_obj) = es_error.get("error") {
            let error_type = error_obj.get("type")
                .and_then(|t| t.as_str())
                .unwrap_or("unknown");
            
            let reason = error_obj.get("reason")
                .and_then(|r| r.as_str())
                .unwrap_or("未知错误");

            return match error_type {
                "index_not_found_exception" => {
                    let index = extract_index_from_error(reason).unwrap_or_else(|| "unknown".to_string());
                    ErrorDetails::index_not_found(&index)
                },
                "parsing_exception" | "query_parsing_exception" => {
                    ErrorDetails::query_syntax_error(reason.to_string())
                },
                "security_exception" => {
                    ErrorDetails::authentication_failed("")
                },
                _ => ErrorDetails::server_error(status, reason.to_string()),
            };
        }
    }

    ErrorDetails::server_error(status, body.to_string())
}

fn extract_index_from_error(error_msg: &str) -> Option<String> {
    // 从错误消息中提取索引名称
    if let Some(start) = error_msg.find("index [") {
        let start = start + 7;
        if let Some(end) = error_msg[start..].find(']') {
            return Some(error_msg[start..start + end].to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_error() {
        let error = ErrorDetails::connection_failed("http://localhost:9200", Some("Connection refused".to_string()));
        assert_eq!(error.code, "CONNECTION_FAILED");
        assert_eq!(error.error_type, ErrorType::Connection);
        assert!(error.recoverable);
    }

    #[test]
    fn test_index_not_found_error() {
        let error = ErrorDetails::index_not_found("test-index");
        assert_eq!(error.code, "INDEX_NOT_FOUND");
        assert_eq!(error.error_type, ErrorType::NotFound);
        assert!(!error.recoverable);
    }

    #[test]
    fn test_parse_http_error() {
        let es_error_json = r#"{
            "error": {
                "type": "index_not_found_exception",
                "reason": "no such index [test-index]"
            }
        }"#;
        
        let error = parse_http_error(404, es_error_json);
        assert_eq!(error.error_type, ErrorType::NotFound);
        assert_eq!(error.code, "INDEX_NOT_FOUND");
    }
}