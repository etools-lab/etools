//! File System Commands
//! Tauri commands for file system operations

use std::fs;
use std::path::Path;

/// Read a text file
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    // Validate path
    let path_obj = Path::new(&path);

    // Check if path exists
    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Check if it's a file (not a directory)
    if !path_obj.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    // Read file content
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Write a text file
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    // Validate path
    let path_obj = Path::new(&path);

    // Create parent directory if it doesn't exist
    if let Some(parent) = path_obj.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    // Write file
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}
