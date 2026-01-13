pub mod app_monitor;
pub mod browser_reader;
pub mod clipboard_watcher;
pub mod config_service;
pub mod file_indexer;
pub mod marketplace_service;
pub mod performance;
pub mod plugin_errors;
pub mod plugin_installer;
pub mod plugin_performance;
pub mod plugin_sandbox;
pub mod plugin_service;
pub mod plugin_validator;
pub mod screen_detector;
pub mod window_calculator;

pub use screen_detector::detect_screen_info;
pub use window_calculator::calculate_window_layout;
