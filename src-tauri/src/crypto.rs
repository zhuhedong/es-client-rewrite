use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Result};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::{rand_core::OsRng as ArgonOsRng, SaltString}};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::api::path::app_data_dir;

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedData {
    pub ciphertext: String,
    pub nonce: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SecureConnectionData {
    pub id: String,
    pub name: String,
    pub url: String,
    pub username: Option<String>,
    pub encrypted_password: Option<EncryptedData>,
    pub headers: std::collections::HashMap<String, String>,
}

pub struct CryptoManager {
    master_key: [u8; 32],
}

impl CryptoManager {
    pub fn new(config: &tauri::Config) -> Result<Self> {
        let key = Self::get_or_create_master_key(config)?;
        Ok(Self { master_key: key })
    }

    fn get_key_file_path(config: &tauri::Config) -> Result<std::path::PathBuf> {
        let app_data_dir = app_data_dir(config)
            .ok_or_else(|| anyhow!("Failed to get app data directory"))?;
        
        fs::create_dir_all(&app_data_dir)?;
        Ok(app_data_dir.join(".key"))
    }

    fn get_or_create_master_key(config: &tauri::Config) -> Result<[u8; 32]> {
        let key_path = Self::get_key_file_path(config)?;
        
        if key_path.exists() {
            // 读取现有密钥
            let key_data = fs::read(&key_path)?;
            if key_data.len() != 32 {
                return Err(anyhow!("Invalid key file"));
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(&key_data);
            Ok(key)
        } else {
            // 生成新密钥
            let key = Aes256Gcm::generate_key(&mut OsRng);
            
            // 设置文件权限为仅当前用户可读写
            fs::write(&key_path, &key)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&key_path)?.permissions();
                perms.set_mode(0o600); // rw-------
                fs::set_permissions(&key_path, perms)?;
            }
            
            Ok(key.into())
        }
    }

    pub fn encrypt_password(&self, password: &str) -> Result<EncryptedData> {
        if password.is_empty() {
            return Err(anyhow!("Password cannot be empty"));
        }

        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&self.master_key));
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        
        let ciphertext = cipher
            .encrypt(&nonce, password.as_bytes())
            .map_err(|e| anyhow!("Encryption failed: {}", e))?;

        Ok(EncryptedData {
            ciphertext: general_purpose::STANDARD.encode(ciphertext),
            nonce: general_purpose::STANDARD.encode(nonce),
        })
    }

    pub fn decrypt_password(&self, encrypted_data: &EncryptedData) -> Result<String> {
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&self.master_key));
        
        let nonce_bytes = general_purpose::STANDARD
            .decode(&encrypted_data.nonce)
            .map_err(|e| anyhow!("Failed to decode nonce: {}", e))?;
        
        let ciphertext_bytes = general_purpose::STANDARD
            .decode(&encrypted_data.ciphertext)
            .map_err(|e| anyhow!("Failed to decode ciphertext: {}", e))?;

        if nonce_bytes.len() != 12 {
            return Err(anyhow!("Invalid nonce length"));
        }

        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let plaintext = cipher
            .decrypt(nonce, ciphertext_bytes.as_ref())
            .map_err(|e| anyhow!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext)
            .map_err(|e| anyhow!("Invalid UTF-8 in decrypted data: {}", e))
    }

    pub fn secure_wipe(data: &mut [u8]) {
        // 安全清除内存中的敏感数据
        use std::ptr;
        unsafe {
            ptr::write_volatile(data.as_mut_ptr(), 0);
            for byte in data.iter_mut() {
                ptr::write_volatile(byte, 0);
            }
        }
    }
}

// 敏感字符串类型，自动清零
pub struct SecureString {
    data: Vec<u8>,
}

impl SecureString {
    pub fn new(s: String) -> Self {
        Self {
            data: s.into_bytes(),
        }
    }

    pub fn as_str(&self) -> Result<&str> {
        std::str::from_utf8(&self.data)
            .map_err(|e| anyhow!("Invalid UTF-8: {}", e))
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        CryptoManager::secure_wipe(&mut self.data);
    }
}

impl std::fmt::Debug for SecureString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SecureString([REDACTED])")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_encrypt_decrypt() -> Result<()> {
        let temp_dir = tempdir()?;
        let mut config = tauri::Config::default();
        
        // 临时测试配置
        let crypto = CryptoManager::new(&config)?;
        
        let password = "test_password_123";
        let encrypted = crypto.encrypt_password(password)?;
        let decrypted = crypto.decrypt_password(&encrypted)?;
        
        assert_eq!(password, decrypted);
        Ok(())
    }

    #[test]
    fn test_secure_string() {
        let secure = SecureString::new("sensitive_data".to_string());
        assert_eq!(secure.as_str().unwrap(), "sensitive_data");
        // SecureString会在drop时自动清零
    }
}