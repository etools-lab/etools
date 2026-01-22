/**
 * Logger Service
 * 初始化和配置后端日志系统
 */

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

// ============================================================================
// Constants
// ============================================================================

/// 后端日志文件名
const BACKEND_LOG_FILE: &str = "backend.log";

/// 日志文件最大大小（10MB）
const MAX_LOG_SIZE: u64 = 10 * 1024 * 1024;

// ============================================================================
// Static State
// ============================================================================

/// 全局日志文件句柄（用于 Write 实现）
static LOG_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

// ============================================================================
// Utility Functions
// ============================================================================

/// 获取后端日志文件路径
fn get_backend_log_path(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))
        .map(|dir| dir.join(BACKEND_LOG_FILE))
}

/// 确保日志文件的父目录存在
fn ensure_log_dir(path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create log directory: {}", e))?;
    }
    Ok(())
}

/// 检查日志文件大小，如果超过限制则轮换
fn rotate_log_if_needed(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let metadata = std::fs::metadata(path)
        .map_err(|e| format!("Failed to get log file metadata: {}", e))?;

    if metadata.len() > MAX_LOG_SIZE {
        // 轮换日志文件：将当前文件重命名为 .old
        let old_path = path.with_extension("log.old");
        std::fs::rename(path, &old_path)
            .map_err(|e| format!("Failed to rotate log file: {}", e))?;

        log::info!("Log file rotated to {:?}", old_path);
    }

    Ok(())
}

// ============================================================================
// Custom Log Implementation
// ============================================================================

/// 自定义 Logger 实现，同时输出到控制台和文件
struct FileLogger {
    app_handle: *const AppHandle,
}

unsafe impl Send for FileLogger {}
unsafe impl Sync for FileLogger {}

impl log::Log for FileLogger {
    fn enabled(&self, _metadata: &log::Metadata) -> bool {
        true
    }

    fn log(&self, record: &log::Record) {
        if !self.enabled(record.metadata()) {
            return;
        }

        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let level = match record.level() {
            log::Level::Error => "ERROR",
            log::Level::Warn => "WARN",
            log::Level::Info => "INFO",
            log::Level::Debug => "DEBUG",
            log::Level::Trace => "TRACE",
        };

        let log_message = format!(
            "[{}] [{}] [{}] {}",
            timestamp,
            level,
            record.module_path().unwrap_or("unknown"),
            record.args()
        );

        // 输出到控制台
        println!("{}", log_message);

        // 输出到文件
        if let Ok(path) = LOG_FILE.lock() {
            if let Some(log_path) = path.as_ref() {
                if let Ok(mut file) = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(log_path)
                {
                    let _ = writeln!(file, "{}", log_message);
                }
            }
        }
    }

    fn flush(&self) {
        // 刷新文件缓冲区
        if let Ok(path) = LOG_FILE.lock() {
            if let Some(log_path) = path.as_ref() {
                if let Ok(file) = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(log_path)
                {
                    let _ = file.sync_all();
                }
            }
        }
    }
}

// ============================================================================
// Public Functions
// ============================================================================

/// 初始化日志系统
///
/// 此函数会：
/// 1. 设置日志文件路径
/// 2. 检查并轮换过大的日志文件
/// 3. 初始化 env_logger
/// 4. 设置自定义的 FileLogger
pub fn init_logger(handle: &AppHandle) -> Result<(), String> {
    let log_path = get_backend_log_path(handle)?;
    ensure_log_dir(&log_path)?;
    rotate_log_if_needed(&log_path)?;

    // 设置全局日志文件路径
    if let Ok(mut log_file) = LOG_FILE.lock() {
        *log_file = Some(log_path.clone());
    }

    // 设置全局 logger
    let logger = FileLogger {
        app_handle: handle as *const AppHandle,
    };

    let max_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    log::set_boxed_logger(Box::new(logger))
        .map_err(|e| format!("Failed to set logger: {}", e))?;
    log::set_max_level(max_level);

    log::info!("Logger initialized. Log file: {:?}", log_path);
    log::info!("Log level: {:?}", max_level);

    Ok(())
}

/// 获取日志文件路径（供外部查询）
pub fn get_log_file_path(handle: &AppHandle) -> Result<PathBuf, String> {
    get_backend_log_path(handle)
}

/// 读取日志文件内容
pub fn read_log_file(handle: &AppHandle, limit: Option<usize>) -> Result<String, String> {
    let log_path = get_backend_log_path(handle)?;

    if !log_path.exists() {
        return Ok(String::new());
    }

    let content = std::fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    // 应用行数限制
    match limit {
        Some(limit) => {
            let lines: Vec<&str> = content.lines().collect();
            let start = lines.len().saturating_sub(limit);
            Ok(lines[start..].join("\n"))
        }
        None => Ok(content),
    }
}

/// 清除日志文件
pub fn clear_log_file(handle: &AppHandle) -> Result<(), String> {
    let log_path = get_backend_log_path(handle)?;

    if log_path.exists() {
        std::fs::remove_file(&log_path)
            .map_err(|e| format!("Failed to remove log file: {}", e))?;
    }

    log::info!("Log file cleared");
    Ok(())
}
