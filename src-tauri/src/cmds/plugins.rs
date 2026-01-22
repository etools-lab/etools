//! Plugin Commands
//! Tauri commands for plugin management
#![allow(unused_variables)]

use crate::models::plugin::*;
use crate::services::plugin_installer::{PluginInstaller, PackageValidation as InstallerValidation, ExtractionResult as InstallerResult};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Get plugins directory
fn get_plugins_dir(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))
        .map(|dir| dir.join("plugins"))
}

/// Ensure plugins directory exists
fn ensure_plugins_dir(handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = get_plugins_dir(handle)?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create plugins dir: {}", e))?;
    Ok(dir)
}

/// Get plugin path
///
/// All plugins are installed via npm to: plugins/node_modules/@etools-plugin/{plugin_id}
/// The plugin_id can be:
/// - Short ID: "devtools"
/// - Full package name: "@etools-plugin/devtools"
fn find_plugin_path(plugins_dir: &PathBuf, plugin_id: &str) -> Result<PathBuf, String> {
    // Extract the short plugin ID (remove @etools-plugin/ prefix if present)
    let short_id = plugin_id.strip_prefix("@etools-plugin/").unwrap_or(plugin_id);

    // All plugins are in the standard npm location
    let plugin_path = plugins_dir
        .join("node_modules")
        .join("@etools-plugin")
        .join(short_id);

    if plugin_path.exists() {
        Ok(plugin_path)
    } else {
        Err(format!("插件不存在: {}", plugin_id))
    }
}

/// List all installed plugins
#[tauri::command]
pub fn plugin_list(handle: AppHandle) -> Result<Vec<Plugin>, String> {
    let plugins_dir = ensure_plugins_dir(&handle)?;
    let mut plugins = Vec::new();

    // Load plugin state (T046)
    let state = load_plugin_state(&handle)?;
    let usage_stats = load_plugin_usage_stats(&handle)?;

    let entries = fs::read_dir(&plugins_dir)
        .map_err(|e| format!("Failed to read plugins directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let manifest_path = path.join("plugin.json");
            if let Ok(manifest) = read_plugin_manifest(&manifest_path) {
                let plugin_id = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // Load enabled state from persisted state (T046)
                let enabled = state.get(&plugin_id).copied().unwrap_or(true);

                // Get installation time
                let installed_at = get_plugin_installation_time(&path)?;

                // Get usage stats
                let stats = usage_stats.get(&plugin_id).cloned().unwrap_or(PluginUsageStats {
                    last_used: None,
                    usage_count: 0,
                    last_execution_time: None,
                    average_execution_time: None,
                });

                // Get plugin health
                let health = get_plugin_health_for(&plugin_id, &path)?;

                plugins.push(Plugin {
                    id: plugin_id.clone(),
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    author: manifest.author,
                    enabled,
                    permissions: manifest.permissions,
                    entry_point: manifest.entry,
                    triggers: manifest.triggers,
                    settings: Default::default(),
                    health,
                    usage_stats: stats,
                    installed_at,
                    install_path: path.to_string_lossy().to_string(),
                    source: crate::models::plugin::PluginSource::Local,
                    update_metadata: None,
                });
            }
        }
    }

    Ok(plugins)
}

/// Get plugin installation time
fn get_plugin_installation_time(path: &PathBuf) -> Result<i64, String> {
    use std::time::SystemTime;
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to get plugin metadata: {}", e))?;
    let modified = metadata.modified()
        .map_err(|e| format!("Failed to get modification time: {}", e))?;
    let duration = modified.duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|e| format!("Failed to convert timestamp: {}", e))?;
    Ok(duration.as_millis() as i64)
}

/// Get plugin health for a plugin
fn get_plugin_health_for(plugin_id: &str, plugin_path: &PathBuf) -> Result<PluginHealth, String> {
    // Try to read manifest from package.json (npm plugins) or plugin.json (legacy plugins)
    let manifest = match read_npm_plugin_manifest(plugin_path) {
        Ok(m) => m,
        Err(_) => {
            // Fallback to plugin.json for legacy plugins
            let manifest_path = plugin_path.join("plugin.json");
            read_plugin_manifest(&manifest_path)?
        }
    };

    let entry_path = plugin_path.join(&manifest.entry);

    let status = if entry_path.exists() {
        PluginHealthStatus::Healthy
    } else {
        PluginHealthStatus::Error
    };

    Ok(PluginHealth {
        status,
        message: None,
        last_checked: chrono::Utc::now().timestamp_millis(),
        errors: vec![],
    })
}

/// Read plugin manifest from file
fn read_plugin_manifest(path: &PathBuf) -> Result<PluginManifest, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))
}

/// Read plugin manifest from npm package.json using ETP protocol
/// Returns Err if package.json doesn't exist or lacks etools field
fn read_npm_plugin_manifest(plugin_path: &PathBuf) -> Result<PluginManifest, String> {
    use crate::models::plugin_metadata::EtoolsMetadata;

    println!("[Plugin] Reading npm plugin manifest from: {:?}", plugin_path);

    let package_json_path = plugin_path.join("package.json");
    if !package_json_path.exists() {
        println!("[Plugin] ⚠️  package.json not found at: {:?}", package_json_path);
        return Err(format!("package.json not found at {:?}", package_json_path));
    }

    let content = fs::read_to_string(&package_json_path)
        .map_err(|e| {
            println!("[Plugin] ⚠️  Failed to read package.json: {}", e);
            format!("Failed to read package.json: {}", e)
        })?;

    let package_data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| {
            println!("[Plugin] ⚠️  Failed to parse package.json: {}", e);
            format!("Failed to parse package.json: {}", e)
        })?;

    // Parse ETP metadata
    let metadata = EtoolsMetadata::from_package_json(&package_data)
        .map_err(|e| {
            println!("[Plugin] ⚠️  ETP validation failed: {}", e);
            format!("ETP validation failed: {}", e)
        })?;

    println!("[Plugin] ✅ Successfully parsed ETP metadata for: {}", metadata.display_name);

    // Get entry point
    let entry_point = package_data["main"]
        .as_str()
        .unwrap_or("index.js")
        .to_string();

    // Convert EtoolsMetadata to PluginManifest
    Ok(PluginManifest {
        name: metadata.display_name,
        version: package_data["version"]
            .as_str()
            .unwrap_or("0.0.0")
            .to_string(),
        description: metadata.description.unwrap_or_default(),
        author: package_data["author"]
            .as_str()
            .map(|s| s.to_string()),
        permissions: metadata.permissions,
        entry: entry_point,
        triggers: metadata.triggers
            .iter()
            .map(|keyword| PluginTrigger {
                keyword: keyword.clone(),
                description: String::new(),
                hotkey: None,
            })
            .collect(),
    })
}

/// Validate plugin manifest (T096)
#[tauri::command]
pub fn validate_plugin_manifest(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginValidationResult, String> {
    let plugins_dir = get_plugins_dir(&handle)?;
    let manifest_path = plugins_dir.join(&plugin_id).join("plugin.json");

    // Check if manifest file exists
    if !manifest_path.exists() {
        return Ok(PluginValidationResult {
            is_valid: false,
            errors: vec![format!("插件清单文件不存在: {:?}", manifest_path)],
            warnings: vec![],
        });
    }

    // Try to parse manifest
    let manifest = match read_plugin_manifest(&manifest_path) {
        Ok(m) => m,
        Err(e) => {
            return Ok(PluginValidationResult {
                is_valid: false,
                errors: vec![format!("解析失败: {}", e)],
                warnings: vec![],
            });
        }
    };

    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Validate plugin_id from directory
    if plugin_id.is_empty() {
        errors.push("插件 ID 不能为空".to_string());
    }

    // Validate ID format (should be alphanumeric with hyphens/underscores)
    if !plugin_id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        errors.push("插件 ID 只能包含字母、数字、连字符和下划线".to_string());
    }

    // Validate required fields from manifest
    if manifest.name.is_empty() {
        errors.push("插件名称不能为空".to_string());
    }

    if manifest.version.is_empty() {
        errors.push("插件版本不能为空".to_string());
    }

    // Validate version format (semver-like)
    if !manifest.version.chars().all(|c| c.is_ascii_digit() || c == '.') {
        warnings.push("版本号格式建议使用语义化版本 (如 1.0.0)".to_string());
    }

    // Validate triggers
    if manifest.triggers.is_empty() {
        warnings.push("插件没有定义任何触发器，用户将无法通过搜索调用".to_string());
    }

    for trigger in &manifest.triggers {
        if !trigger.keyword.ends_with(':') {
            warnings.push(format!("触发器 '{}' 建议以冒号结尾", trigger.keyword));
        }
    }

    // Validate entry point
    if manifest.entry.is_empty() {
        errors.push("插件入口点不能为空".to_string());
    } else {
        let entry_path = plugins_dir.join(&plugin_id).join(&manifest.entry);
        if !entry_path.exists() {
            errors.push(format!("入口点文件不存在: {:?}", entry_path));
        }
    }

    // Validate permissions
    let valid_permissions = [
        "read_clipboard", "write_clipboard",
        "read_file", "write_file",
        "network", "shell", "notification",
    ];

    for perm in &manifest.permissions {
        if !valid_permissions.contains(&perm.as_str()) {
            warnings.push(format!("未知权限: '{}'", perm));
        }
    }

    // Check for dangerous permission combinations
    if manifest.permissions.contains(&"shell".to_string()) {
        warnings.push("shell 权限具有安全风险，请谨慎使用".to_string());
    }

    let is_valid = errors.is_empty();

    Ok(PluginValidationResult {
        is_valid,
        errors,
        warnings,
    })
}

/// Plugin validation result
#[derive(Debug, Clone, serde::Serialize)]
pub struct PluginValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Get plugin state file path (T046)
fn get_plugin_state_path(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))
        .map(|dir| dir.join("plugin-state.json"))
}

/// Load plugin state (T046)
fn load_plugin_state(handle: &AppHandle) -> Result<std::collections::HashMap<String, bool>, String> {
    let state_path = get_plugin_state_path(handle)?;
    if !state_path.exists() {
        return Ok(std::collections::HashMap::new());
    }

    let content = fs::read_to_string(&state_path)
        .map_err(|e| format!("Failed to read plugin state: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse plugin state: {}", e))
}

/// Save plugin state (T046)
fn save_plugin_state(handle: &AppHandle, state: &std::collections::HashMap<String, bool>) -> Result<(), String> {
    let state_path = get_plugin_state_path(handle)?;
    let json = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize plugin state: {}", e))?;

    fs::write(&state_path, json)
        .map_err(|e| format!("Failed to write plugin state: {}", e))
}

/// Save plugin enabled state
fn save_plugin_enabled_state(handle: &AppHandle, plugin_id: &str, enabled: bool) -> Result<(), String> {
    // Load existing state
    let state = load_plugin_state(handle)?;
    let mut new_state = state.clone();

    // Update the plugin's enabled state
    new_state.insert(plugin_id.to_string(), enabled);

    // Save the updated state
    save_plugin_state(handle, &new_state)
}

/// Get plugin enabled state
pub fn get_plugin_enabled_state(handle: &AppHandle, plugin_id: &str) -> Result<bool, String> {
    let state = load_plugin_state(handle)?;

    // If plugin is not in state, it's enabled by default
    Ok(state.get(plugin_id).copied().unwrap_or(true))
}

/// Remove plugin state (US4)
pub fn remove_plugin_state(handle: &AppHandle, plugin_id: &str) -> Result<(), String> {
    // Load existing state
    let state = load_plugin_state(handle)?;
    let mut new_state = state.clone();

    // Remove the plugin's state
    new_state.remove(plugin_id);

    // Save the updated state
    save_plugin_state(handle, &new_state)
}

/// Install a plugin (T043)
#[tauri::command]
pub fn install_plugin(
    handle: AppHandle,
    plugin_path: String,
) -> Result<Plugin, String> {
    // For now, plugin_path is expected to be a directory path
    let source_dir = PathBuf::from(&plugin_path);

    if !source_dir.exists() {
        return Err(format!("Plugin path does not exist: {}", plugin_path));
    }

    // Read manifest
    let manifest_path = source_dir.join("plugin.json");
    let manifest = read_plugin_manifest(&manifest_path)?;

    // Validate manifest
    let plugin_id = source_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let validation = validate_plugin_manifest(handle.clone(), plugin_id.clone())?;
    if !validation.is_valid {
        return Err(format!("Plugin validation failed: {}", validation.errors.join(", ")));
    }

    // Copy plugin to plugins directory
    let plugins_dir = ensure_plugins_dir(&handle)?;
    let target_dir = plugins_dir.join(&plugin_id);

    // Remove existing if present
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("Failed to remove existing plugin: {}", e))?;
    }

    // Copy plugin files
    copy_dir_recursive(&source_dir, &target_dir)?;

    let installed_at = chrono::Utc::now().timestamp_millis();

    Ok(Plugin {
        id: plugin_id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        enabled: true,
        permissions: manifest.permissions,
        entry_point: manifest.entry,
        triggers: manifest.triggers,
        settings: Default::default(),
        health: PluginHealth {
            status: PluginHealthStatus::Healthy,
            message: None,
            last_checked: installed_at,
            errors: vec![],
        },
        usage_stats: PluginUsageStats {
            last_used: None,
            usage_count: 0,
            last_execution_time: None,
            average_execution_time: None,
        },
        installed_at,
        install_path: target_dir.to_string_lossy().to_string(),
        source: crate::models::plugin::PluginSource::Local,
        update_metadata: None,
    })
}

/// Copy directory recursively
fn copy_dir_recursive(source: &PathBuf, target: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(target)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    for entry in fs::read_dir(source)
        .map_err(|e| format!("Failed to read source directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());

        if source_path.is_dir() {
            copy_dir_recursive(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

/// Uninstall a plugin
#[tauri::command]
pub fn uninstall_plugin(
    handle: AppHandle,
    plugin_id: String,
) -> Result<(), String> {
    let plugins_dir = get_plugins_dir(&handle)?;
    let plugin_path = plugins_dir.join(&plugin_id);

    if plugin_path.exists() {
        fs::remove_dir_all(&plugin_path)
            .map_err(|e| format!("Failed to remove plugin: {}", e))?;
    }

    Ok(())
}

/// Get plugin manifest
#[tauri::command]
pub fn get_plugin_manifest(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginManifest, String> {
    let plugins_dir = get_plugins_dir(&handle)?;
    let manifest_path = plugins_dir.join(&plugin_id).join("plugin.json");
    read_plugin_manifest(&manifest_path)
}

/// Reload a plugin
#[tauri::command]
pub fn reload_plugin(
    handle: AppHandle,
    plugin_id: String,
) -> Result<Plugin, String> {
    // TODO: Implement plugin reload logic
    let now = chrono::Utc::now().timestamp_millis();
    Ok(Plugin {
        id: plugin_id,
        name: "Reloaded Plugin".to_string(),
        version: "1.0.0".to_string(),
        description: "A reloaded plugin".to_string(),
        author: Some("Unknown".to_string()),
        enabled: true,
        permissions: vec![],
        entry_point: "index.ts".to_string(),
        triggers: vec![],
        settings: Default::default(),
        health: PluginHealth {
            status: PluginHealthStatus::Healthy,
            message: None,
            last_checked: now,
            errors: vec![],
        },
        usage_stats: PluginUsageStats {
            last_used: None,
            usage_count: 0,
            last_execution_time: None,
            average_execution_time: None,
        },
        installed_at: now,
        install_path: String::new(),
        source: crate::models::plugin::PluginSource::Local,
        update_metadata: None,
    })
}

/// Grant plugin permission
#[tauri::command]
pub fn grant_plugin_permission(
    handle: AppHandle,
    plugin_id: String,
    permission: String,
) -> Result<(), String> {
    // TODO: Implement permission granting
    Ok(())
}

/// Revoke plugin permission
#[tauri::command]
pub fn revoke_plugin_permission(
    handle: AppHandle,
    plugin_id: String,
    permission: String,
) -> Result<(), String> {
    // TODO: Implement permission revocation
    Ok(())
}

/// Get plugin permissions and settings
#[tauri::command]
pub fn get_plugin_permissions(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginPermissionsResponse, String> {
    // Get plugin manifest to check required permissions
    let plugins_dir = get_plugins_dir(&handle)?;
    let manifest_path = plugins_dir.join(&plugin_id).join("plugin.json");
    let manifest = read_plugin_manifest(&manifest_path)?;

    // TODO: Load granted permissions from state
    // For now, return all permissions from manifest
    Ok(PluginPermissionsResponse {
        permissions: manifest.permissions,
        settings: Default::default(),
    })
}

/// Get plugin settings file path (T045)
fn get_plugin_settings_path(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))
        .map(|dir| dir.join("plugin-settings.json"))
}

/// Load plugin settings (T045)
fn load_plugin_settings(handle: &AppHandle) -> Result<std::collections::HashMap<String, std::collections::HashMap<String, serde_json::Value>>, String> {
    let settings_path = get_plugin_settings_path(handle)?;
    if !settings_path.exists() {
        return Ok(std::collections::HashMap::new());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read plugin settings: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse plugin settings: {}", e))
}

/// Save plugin settings (T045)
fn save_plugin_settings(handle: &AppHandle, settings: &std::collections::HashMap<String, std::collections::HashMap<String, serde_json::Value>>) -> Result<(), String> {
    let settings_path = get_plugin_settings_path(handle)?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize plugin settings: {}", e))?;

    fs::write(&settings_path, json)
        .map_err(|e| format!("Failed to write plugin settings: {}", e))
}

/// Set plugin setting (T045)
#[tauri::command]
pub fn set_plugin_setting(
    handle: AppHandle,
    plugin_id: String,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    let mut all_settings = load_plugin_settings(&handle)?;
    let plugin_settings = all_settings.entry(plugin_id).or_insert_with(std::collections::HashMap::new);
    plugin_settings.insert(key, value);
    save_plugin_settings(&handle, &all_settings)
}

/// Get plugin setting (T045)
#[tauri::command]
pub fn get_plugin_setting(
    handle: AppHandle,
    plugin_id: String,
    key: String,
) -> Result<serde_json::Value, String> {
    let all_settings = load_plugin_settings(&handle)?;
    if let Some(plugin_settings) = all_settings.get(&plugin_id) {
        if let Some(value) = plugin_settings.get(&key) {
            return Ok(value.clone());
        }
    }
    Ok(serde_json::Value::Null)
}

// ============================================================================
// Usage Statistics (T092)
// ============================================================================

// ============================================================================
// Usage Statistics (T092)
// ============================================================================

/// Get plugin usage stats file path
fn get_plugin_usage_stats_path(handle: &AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))
        .map(|dir| dir.join("plugin-usage-stats.json"))
}

/// Load plugin usage stats
fn load_plugin_usage_stats(handle: &AppHandle) -> Result<HashMap<String, PluginUsageStats>, String> {
    let stats_path = get_plugin_usage_stats_path(handle)?;
    if !stats_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&stats_path)
        .map_err(|e| format!("Failed to read plugin usage stats: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse plugin usage stats: {}", e))
}

/// Save plugin usage stats
#[allow(dead_code)]
fn save_plugin_usage_stats(handle: &AppHandle, stats: &HashMap<String, PluginUsageStats>) -> Result<(), String> {
    let stats_path = get_plugin_usage_stats_path(handle)?;
    let json = serde_json::to_string_pretty(stats)
        .map_err(|e| format!("Failed to serialize plugin usage stats: {}", e))?;

    fs::write(&stats_path, json)
        .map_err(|e| format!("Failed to write plugin usage stats: {}", e))
}

/// Get plugin usage stats
#[tauri::command]
pub fn get_plugin_usage_stats(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginUsageStats, String> {
    let all_stats = load_plugin_usage_stats(&handle)?;
    Ok(all_stats.get(&plugin_id).cloned().unwrap_or(PluginUsageStats {
        last_used: None,
        usage_count: 0,
        last_execution_time: None,
        average_execution_time: None,
    }))
}

// ============================================================================
// Health Check Commands (T088-T090)
// ============================================================================

/// Get plugin health
#[tauri::command]
pub fn get_plugin_health(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginHealth, String> {
    let plugins_dir = get_plugins_dir(&handle)?;
    let plugin_path = plugins_dir.join(&plugin_id);
    get_plugin_health_for(&plugin_id, &plugin_path)
}

/// Check plugin health
#[tauri::command]
pub fn check_plugin_health(
    handle: AppHandle,
    plugin_id: String,
) -> Result<PluginHealth, String> {
    // Trigger active health check
    let plugins_dir = get_plugins_dir(&handle)?;
    let plugin_path = plugins_dir.join(&plugin_id);

    let manifest_path = plugin_path.join("plugin.json");
    let manifest = read_plugin_manifest(&manifest_path)?;
    let entry_path = plugin_path.join(&manifest.entry);

    // Check if entry point exists and is readable
    let mut errors = vec![];
    let status = if entry_path.exists() {
        // Try to read the file
        match fs::read_to_string(&entry_path) {
            Ok(_) => PluginHealthStatus::Healthy,
            Err(e) => {
                errors.push(crate::models::plugin::PluginErrorEntry {
                    code: "READ_ERROR".to_string(),
                    message: format!("Failed to read entry point: {}", e),
                    timestamp: chrono::Utc::now().timestamp_millis(),
                    context: None,
                });
                PluginHealthStatus::Error
            }
        }
    } else {
        errors.push(crate::models::plugin::PluginErrorEntry {
            code: "MISSING_ENTRY".to_string(),
            message: format!("Entry point not found: {:?}", entry_path),
            timestamp: chrono::Utc::now().timestamp_millis(),
            context: None,
        });
        PluginHealthStatus::Error
    };

    // Compute message before moving status
    let message = if status == PluginHealthStatus::Healthy {
        Some("Plugin is healthy".to_string())
    } else {
        Some("Plugin has errors".to_string())
    };

    Ok(PluginHealth {
        status,
        message,
        last_checked: chrono::Utc::now().timestamp_millis(),
        errors,
    })
}

// ============================================================================
// Bulk Operations (T047-T050)
// ============================================================================

/// Bulk enable plugins
#[tauri::command]
pub async fn bulk_enable_plugins(
    handle: AppHandle,
    plugin_ids: Vec<String>,
) -> Result<BulkOperation, String> {
    let started_at = chrono::Utc::now().timestamp_millis();
    let mut results = vec![];

    for plugin_id in &plugin_ids {
        let result = match enable_plugin(handle.clone(), plugin_id.clone()).await {
            Ok(_) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: true,
                error: None,
            },
            Err(e) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: false,
                error: Some(e),
            },
        };
        results.push(result);
    }

    let status = if results.iter().all(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::Completed
    } else if results.iter().any(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::PartialFailure
    } else {
        crate::models::plugin::BulkOperationStatus::Failed
    };

    Ok(crate::models::plugin::BulkOperation {
        operation_type: crate::models::plugin::BulkOperationType::Enable,
        target_plugin_ids: plugin_ids,
        status,
        results,
        started_at,
        completed_at: Some(chrono::Utc::now().timestamp_millis()),
    })
}

/// Bulk disable plugins
#[tauri::command]
pub async fn bulk_disable_plugins(
    handle: AppHandle,
    plugin_ids: Vec<String>,
) -> Result<BulkOperation, String> {
    let started_at = chrono::Utc::now().timestamp_millis();
    let mut results = vec![];

    for plugin_id in &plugin_ids {
        let result = match disable_plugin(handle.clone(), plugin_id.clone()).await {
            Ok(_) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: true,
                error: None,
            },
            Err(e) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: false,
                error: Some(e),
            },
        };
        results.push(result);
    }

    let status = if results.iter().all(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::Completed
    } else if results.iter().any(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::PartialFailure
    } else {
        crate::models::plugin::BulkOperationStatus::Failed
    };

    Ok(crate::models::plugin::BulkOperation {
        operation_type: crate::models::plugin::BulkOperationType::Disable,
        target_plugin_ids: plugin_ids,
        status,
        results,
        started_at,
        completed_at: Some(chrono::Utc::now().timestamp_millis()),
    })
}

/// Bulk uninstall plugins
#[tauri::command]
pub fn bulk_uninstall_plugins(
    handle: AppHandle,
    plugin_ids: Vec<String>,
) -> Result<BulkOperation, String> {
    let started_at = chrono::Utc::now().timestamp_millis();
    let mut results = vec![];

    for plugin_id in &plugin_ids {
        let result = match uninstall_plugin(handle.clone(), plugin_id.clone()) {
            Ok(()) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: true,
                error: None,
            },
            Err(e) => crate::models::plugin::BulkOperationResult {
                plugin_id: plugin_id.clone(),
                success: false,
                error: Some(e),
            },
        };
        results.push(result);
    }

    let status = if results.iter().all(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::Completed
    } else if results.iter().any(|r| r.success) {
        crate::models::plugin::BulkOperationStatus::PartialFailure
    } else {
        crate::models::plugin::BulkOperationStatus::Failed
    };

    Ok(crate::models::plugin::BulkOperation {
        operation_type: crate::models::plugin::BulkOperationType::Uninstall,
        target_plugin_ids: plugin_ids,
        status,
        results,
        started_at,
        completed_at: Some(chrono::Utc::now().timestamp_millis()),
    })
}

/// Cancel installation response
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CancelInstallResponse {
    pub success: bool,
    pub message: String,
    pub cleanup_required: bool,
}

/// Validate plugin package from file (US1-T004)
#[tauri::command]
pub async fn plugin_validate_package(
    handle: AppHandle,
    file_path: String,
    _source: String,
) -> Result<InstallerValidation, String> {
    let temp_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?
        .join("temp");
    
    let installer = PluginInstaller::new(temp_dir, get_plugins_dir(&handle)?);
    installer
        .validate_package(&file_path)
        .await
        .map_err(|e| e.to_string())
}

/// Extract plugin package (US1-T005)
#[tauri::command]
pub async fn plugin_extract_package(
    handle: AppHandle,
    file_path: String,
) -> Result<InstallerResult, String> {
    let temp_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?
        .join("temp");
    
    let installer = PluginInstaller::new(temp_dir, get_plugins_dir(&handle)?);
    installer
        .extract_package(&file_path)
        .await
        .map_err(|e| e.to_string())
}

/// Install plugin from extracted directory (US1-T006)
#[tauri::command]
pub async fn plugin_install(
    handle: AppHandle,
    extracted_path: String,
    plugin_id: String,
    _permissions: Vec<String>,
    auto_enable: Option<bool>,
) -> Result<Plugin, String> {
    let plugins_dir = get_plugins_dir(&handle)?;
    let temp_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?
        .join("temp");

    let installer = PluginInstaller::new(temp_dir, plugins_dir.clone());

    // Install plugin
    installer
        .install_plugin(&extracted_path, &plugin_id)
        .await
        .map_err(|e| e.to_string())?;

    // Set enabled state
    let enabled = auto_enable.unwrap_or(false);
    save_plugin_enabled_state(&handle, &plugin_id, enabled)
        .map_err(|e| format!("Failed to save plugin state: {}", e))?;

    // Load and return installed plugin
    let manifest_path = plugins_dir.join(&plugin_id).join("plugin.json");
    let manifest = read_plugin_manifest(&manifest_path)
        .map_err(|e| format!("Failed to read installed manifest: {}", e))?;

    let health = get_plugin_health_for(&plugin_id, &plugins_dir.join(&plugin_id))?;
    let stats = PluginUsageStats {
        last_used: None,
        usage_count: 0,
        last_execution_time: None,
        average_execution_time: None,
    };

    let installed_at = get_plugin_installation_time(&plugins_dir.join(&plugin_id))
        .map_err(|e| format!("Failed to get installation time: {}", e))?;

    let plugin_path = plugins_dir.join(&plugin_id);

    Ok(Plugin {
        id: plugin_id.clone(),
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        enabled,
        permissions: manifest.permissions,
        entry_point: manifest.entry,
        triggers: manifest.triggers,
        settings: HashMap::new(),
        health,
        usage_stats: stats,
        installed_at,
        install_path: plugin_path.to_string_lossy().to_string(),
        source: crate::models::plugin::PluginSource::Local,
        update_metadata: None,
    })
}

/// Get plugin installation status (US1-T007)
#[tauri::command]
pub async fn plugin_get_install_status(
    _handle: AppHandle,
    install_id: String,
) -> Result<InstallProgress, String> {
    // For now, return a simulated progress
    // In real implementation, you'd track actual installation progress
    Ok(InstallProgress {
        install_id,
        stage: "complete".to_string(),
        progress: 100,
        message: "Installation completed".to_string(),
    })
}

/// Cancel installation (US1-T008)
#[tauri::command]
pub async fn plugin_cancel_install(
    _handle: AppHandle,
    _install_id: String,
    cleanup: Option<bool>,
) -> Result<CancelInstallResponse, String> {
    // For now, just return success
    // In real implementation, you'd clean up temp files and cancel operations
    Ok(CancelInstallResponse {
        success: true,
        message: "Installation cancelled".to_string(),
        cleanup_required: cleanup.unwrap_or(true),
    })
}

// ============================================================================
// Buffer-based Plugin Installation (for drag-and-drop from web)
// ============================================================================

/// Validate plugin package from buffer (US1-T004)
#[tauri::command]
pub async fn plugin_validate_package_from_buffer(
    handle: AppHandle,
    buffer: Vec<u8>,
    file_name: String,
    _source: String,
) -> Result<InstallerValidation, String> {
    let temp_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?
        .join("temp");
    
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // Write buffer to temp file
    let temp_file = temp_dir.join(&file_name);
    fs::write(&temp_file, &buffer)
        .map_err(|e| format!("Failed to write buffer to file: {}", e))?;
    
    let installer = PluginInstaller::new(temp_dir, get_plugins_dir(&handle)?);
    installer
        .validate_package(temp_file.to_string_lossy().as_ref())
        .await
        .map_err(|e| e.to_string())
}

/// Extract plugin package from buffer (US1-T005)
#[tauri::command]
pub async fn plugin_extract_package_from_buffer(
    handle: AppHandle,
    buffer: Vec<u8>,
    file_name: String,
) -> Result<InstallerResult, String> {
    let temp_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?
        .join("temp");
    
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // Write buffer to temp file
    let temp_file = temp_dir.join(&file_name);
    fs::write(&temp_file, &buffer)
        .map_err(|e| format!("Failed to write buffer to file: {}", e))?;

    let installer = PluginInstaller::new(temp_dir, get_plugins_dir(&handle)?);
    installer
        .extract_package(temp_file.to_string_lossy().as_ref())
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Enable/Disable Commands (US3)
// ============================================================================

/// Enable a plugin
#[tauri::command]
pub async fn enable_plugin(handle: AppHandle, plugin_id: String) -> Result<Plugin, String> {
    let plugins_dir = ensure_plugins_dir(&handle)?;

    // Find plugin path (tries direct and npm-style locations)
    let actual_path = find_plugin_path(&plugins_dir, &plugin_id)?;

    // Update enabled state
    save_plugin_enabled_state(&handle, &plugin_id, true)?;

    // Try to read manifest from plugin.json (legacy plugins) or package.json (npm plugins)
    let manifest = match read_npm_plugin_manifest(&actual_path) {
        Ok(m) => m,
        Err(e) => {
            // Fallback to plugin.json for legacy plugins
            let manifest_path = actual_path.join("plugin.json");
            read_plugin_manifest(&manifest_path)
                .map_err(|e| format!("Failed to read manifest: {}", e))?
        }
    };

    let health = get_plugin_health_for(&plugin_id, &actual_path)?;
    let stats = load_plugin_usage_stats(&handle)?
        .get(&plugin_id)
        .cloned()
        .unwrap_or_default();

    let installed_at = get_plugin_installation_time(&actual_path)
        .map_err(|e| format!("Failed to get installation time: {}", e))?;

    Ok(Plugin {
        id: plugin_id.clone(),
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        enabled: true,
        permissions: manifest.permissions,
        entry_point: manifest.entry,
        triggers: manifest.triggers,
        settings: HashMap::new(),
        health,
        usage_stats: stats,
        install_path: actual_path.to_string_lossy().to_string(),
        source: crate::models::plugin::PluginSource::Local,
        installed_at,
        update_metadata: None,
    })
}

/// Disable a plugin
#[tauri::command]
pub async fn disable_plugin(handle: AppHandle, plugin_id: String) -> Result<Plugin, String> {
    let plugins_dir = ensure_plugins_dir(&handle)?;

    // Find plugin path (tries direct and npm-style locations)
    let actual_path = find_plugin_path(&plugins_dir, &plugin_id)?;

    // Update enabled state
    save_plugin_enabled_state(&handle, &plugin_id, false)?;

    // Try to read manifest from plugin.json (legacy plugins) or package.json (npm plugins)
    let manifest = match read_npm_plugin_manifest(&actual_path) {
        Ok(m) => m,
        Err(e) => {
            // Fallback to plugin.json for legacy plugins
            let manifest_path = actual_path.join("plugin.json");
            read_plugin_manifest(&manifest_path)
                .map_err(|e| format!("Failed to read manifest: {}", e))?
        }
    };

    let health = get_plugin_health_for(&plugin_id, &actual_path)?;
    let stats = load_plugin_usage_stats(&handle)?
        .get(&plugin_id)
        .cloned()
        .unwrap_or_default();

    let installed_at = get_plugin_installation_time(&actual_path)
        .map_err(|e| format!("Failed to get installation time: {}", e))?;

    Ok(Plugin {
        id: plugin_id.clone(),
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        enabled: false,
        permissions: manifest.permissions,
        entry_point: manifest.entry,
        triggers: manifest.triggers,
        settings: HashMap::new(),
        health,
        usage_stats: stats,
        install_path: actual_path.to_string_lossy().to_string(),
        source: crate::models::plugin::PluginSource::Local,
        installed_at,
        update_metadata: None,
    })
}

// ============================================================================
// Uninstall Command (US4)
// ============================================================================

/// Uninstall a plugin
#[tauri::command]
pub async fn plugin_uninstall(handle: AppHandle, plugin_id: String) -> Result<(), String> {
    // TODO: Check if it's a core plugin that should not be uninstalled
    let core_plugins = vec!["core", "system"];
    if core_plugins.contains(&plugin_id.as_str()) {
        return Err(format!("不能卸载核心插件: {}", plugin_id));
    }

    let plugins_dir = ensure_plugins_dir(&handle)?;

    // 1. 先读取插件的 package.json 获取真实的包名
    // 因为 plugin_id 可能是短 ID (如 "devtools")
    // 而 package.json 中记录的可能是完整包名 (如 "@etools-plugin/devtools")
    let actual_package_name = {
        // 尝试从 node_modules 中读取插件的 package.json
        let npm_package_path = plugins_dir
            .join("node_modules")
            .join("@etools-plugin")
            .join(&plugin_id)
            .join("package.json");

        if npm_package_path.exists() {
            let content = std::fs::read_to_string(&npm_package_path)
                .map_err(|e| format!("Failed to read plugin package.json: {}", e))?;
            let data: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse plugin package.json: {}", e))?;
            data["name"]
                .as_str()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("@etools-plugin/{}", plugin_id))
        } else {
            // 如果找不到，使用默认格式
            format!("@etools-plugin/{}", plugin_id)
        }
    };

    println!("[plugin_uninstall] Actual package name: {}", actual_package_name);

    // 2. Use npm uninstall (matches new installation approach)
    println!("[plugin_uninstall] Running: npm uninstall {}", actual_package_name);
    let output = Command::new("npm")
        .args(["uninstall", &actual_package_name])
        .current_dir(&plugins_dir)
        .output()
        .map_err(|e| format!("Failed to execute npm uninstall: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("npm uninstall failed: {}", error));
    }

    println!("[plugin_uninstall] npm uninstall successful");

    // Remove plugin state
    remove_plugin_state(&handle, &plugin_id)?;

    // 3. Update package.json - remove plugin from dependencies
    let package_json_path = plugins_dir.join("package.json");

    if package_json_path.exists() {
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        let mut package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // Ensure dependencies is always an object
        if package_data["dependencies"].is_null() {
            package_data["dependencies"] = serde_json::json!({});
        }

        // Remove from dependencies using the actual package name
        let removed = if let Some(dependencies) = package_data["dependencies"].as_object_mut() {
            dependencies.remove(&actual_package_name).is_some()
        } else {
            false
        };

        if removed {
            println!("[plugin_uninstall] ✅ Removed {} from package.json dependencies", actual_package_name);
        } else {
            println!("[plugin_uninstall] ⚠️  {} not found in dependencies", actual_package_name);
        }

        // Write back to package.json
        let updated_json = serde_json::to_string_pretty(&package_data)
            .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

        std::fs::write(&package_json_path, updated_json)
            .map_err(|e| format!("Failed to write package.json: {}", e))?;

        println!("[plugin_uninstall] ✅ package.json updated");
    }

    Ok(())
}

// ============================================================================
// Plugin Abbreviation Commands
// ============================================================================

/// Plugin abbreviation structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginAbbreviation {
    pub keyword: String,
    pub enabled: bool,
}

/// Get plugin abbreviations configuration file path
fn get_abbreviations_config_path(handle: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))?;

    Ok(data_dir.join("plugin_abbreviations.json"))
}

/// Get all plugin abbreviations
#[tauri::command]
pub fn get_plugin_abbreviations(handle: AppHandle) -> Result<HashMap<String, Vec<PluginAbbreviation>>, String> {
    let config_path = get_abbreviations_config_path(&handle)?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read abbreviations config: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse abbreviations config: {}", e))
}

/// Save plugin abbreviations
#[tauri::command]
pub fn save_plugin_abbreviations(
    handle: AppHandle,
    config: HashMap<String, Vec<PluginAbbreviation>>,
) -> Result<(), String> {
    let config_path = get_abbreviations_config_path(&handle)?;

    // Ensure parent directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize abbreviations config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write abbreviations config: {}", e))?;

    Ok(())
}

/// Set abbreviation for a plugin
#[tauri::command]
pub fn set_plugin_abbreviation(
    handle: AppHandle,
    plugin_id: String,
    abbreviation: PluginAbbreviation,
) -> Result<(), String> {
    let mut config = get_plugin_abbreviations(handle.clone())?;

    config.entry(plugin_id.clone())
        .or_insert_with(Vec::new)
        .push(abbreviation);

    save_plugin_abbreviations(handle, config)
}

/// Remove abbreviation from a plugin
#[tauri::command]
pub fn remove_plugin_abbreviation(
    handle: AppHandle,
    plugin_id: String,
    keyword: String,
) -> Result<(), String> {
    let mut config = get_plugin_abbreviations(handle.clone())?;

    if let Some(abbreviations) = config.get_mut(&plugin_id) {
        abbreviations.retain(|abbr| abbr.keyword != keyword);
    }

    save_plugin_abbreviations(handle, config)
}

