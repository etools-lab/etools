//! NPM-based Marketplace Commands
//! Tauri commands for npm-based plugin marketplace operations
//!
//! Uses ETP (etools Plugin Metadata Protocol) for strict validation

use crate::services::marketplace_service::MarketplaceService;
use crate::models::plugin::*;
use crate::models::plugin_metadata::EtoolsMetadata;
use tauri::{AppHandle, Manager};
use std::sync::Mutex;

// Lazy static marketplace service
use std::sync::OnceLock;

static MARKETPLACE_SERVICE: OnceLock<Mutex<MarketplaceService>> = OnceLock::new();

fn get_marketplace_service() -> &'static Mutex<MarketplaceService> {
    MARKETPLACE_SERVICE.get_or_init(|| Mutex::new(MarketplaceService::new()))
}

/// List marketplace plugins from npm registry
#[tauri::command]
pub fn marketplace_list(
    category: Option<String>,
    page: u32,
    page_size: u32,
    handle: AppHandle,
) -> Result<MarketplacePluginPage, String> {
    println!("[Marketplace] Listing plugins - category: {:?}, page: {}", category, page);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let category_ref = category.as_deref();
    service.list_plugins(category_ref, page, page_size, &handle)
}

/// Search marketplace plugins on npm
#[tauri::command]
pub fn marketplace_search(
    query: String,
    category: Option<String>,
    page: u32,
    page_size: u32,
    handle: AppHandle,
) -> Result<MarketplacePluginPage, String> {
    println!("[Marketplace] Searching plugins - query: {}, category: {:?}", query, category);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    let category_ref = category.as_deref();
    service.search_plugins(&query, category_ref, page, page_size, &handle)
}

/// Install a plugin from npm
/// 安装后更新 package.json
///
/// @param package_name - npm package name (e.g., "@etools-plugin/hello")
#[tauri::command]
pub fn marketplace_install(
    package_name: String,
    handle: AppHandle,
) -> Result<Plugin, String> {
    println!("[Marketplace] Installing plugin: {}", package_name);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 1. 从 npm 下载并安装
    let plugin = service.install_plugin(&package_name, &handle)?;

    // 2. 更新 package.json
    let plugins_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))?
        .join("plugins");

    let package_json_path = plugins_dir.join("package.json");

    // 读取现有的 package.json
    let package_json_content = if package_json_path.exists() {
        std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?
    } else {
        // 如果不存在，创建基础结构
        let empty_package = r#"{
  "name": "etools-plugins",
  "version": "1.0.0",
  "description": "Installed plugins registry",
  "dependencies": {}
}"#;
        std::fs::write(&package_json_path, empty_package)
            .map_err(|e| format!("Failed to create package.json: {}", e))?;
        empty_package.to_string()
    };

    // 解析并更新 dependencies
    let mut package_data: serde_json::Value = serde_json::from_str(&package_json_content)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;

    // 添加插件到 dependencies（使用 latest 版本）
    // 确保 dependencies 字段存在
    if package_data["dependencies"].is_null() {
        package_data["dependencies"] = serde_json::json!({});
    }

    if let Some(dependencies) = package_data["dependencies"].as_object_mut() {
        dependencies.entry(package_name.clone()).or_insert_with(|| serde_json::json!("latest"));
    } else {
        // 如果 dependencies 不是对象，创建一个新对象
        let mut new_deps = serde_json::Map::new();
        new_deps.insert(package_name.clone(), serde_json::json!("latest"));
        package_data["dependencies"] = serde_json::Value::Object(new_deps);
    }

    // 写回 package.json
    let updated_json = serde_json::to_string_pretty(&package_data)
        .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

    std::fs::write(&package_json_path, updated_json)
        .map_err(|e| format!("Failed to write package.json: {}", e))?;

    println!("[Marketplace] ✅ Plugin {} installed and package.json updated", package_name);

    Ok(plugin)
}

/// Uninstall a plugin using npm
/// 卸载后从 package.json 移除
///
/// @param package_name - npm package name to uninstall
#[tauri::command]
pub fn marketplace_uninstall(
    package_name: String,
    handle: AppHandle,
) -> Result<(), String> {
    println!("[Marketplace] Uninstalling plugin: {}", package_name);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 1. 从文件系统卸载
    service.uninstall_plugin(&package_name, &handle)?;

    // 2. 从 package.json 移除
    let plugins_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))?
        .join("plugins");

    let package_json_path = plugins_dir.join("package.json");

    // 读取现有的 package.json
    if package_json_path.exists() {
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        // 解析并更新 dependencies
        let mut package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // Ensure dependencies is always an object
        if package_data["dependencies"].is_null() {
            package_data["dependencies"] = serde_json::json!({});
        }

        // 从 dependencies 中移除插件
        if let Some(dependencies) = package_data["dependencies"].as_object_mut() {
            dependencies.remove(&package_name);
        }

        // 写回 package.json
        let updated_json = serde_json::to_string_pretty(&package_data)
            .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

        std::fs::write(&package_json_path, updated_json)
            .map_err(|e| format!("Failed to write package.json: {}", e))?;
    }

    println!("[Marketplace] ✅ Plugin {} uninstalled and removed from package.json", package_name);

    Ok(())
}

/// Update a plugin using npm
///
/// @param package_name - npm package name to update
#[tauri::command]
pub fn marketplace_update(
    package_name: String,
    handle: AppHandle,
) -> Result<Plugin, String> {
    println!("[Marketplace] Updating plugin: {}", package_name);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    service.update_plugin(&package_name, &handle)
}

/// Check for plugin updates
/// Returns a list of plugins that have updates available on npm
#[tauri::command]
pub fn marketplace_check_updates(
    handle: AppHandle,
) -> Result<Vec<PluginUpdateInfo>, String> {
    println!("[Marketplace] Checking for plugin updates");

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    service.check_updates(&handle)
}

/// Get plugin details from npm registry
#[tauri::command]
pub fn marketplace_get_plugin(
    package_name: String,
    handle: AppHandle,
) -> Result<MarketplacePlugin, String> {
    println!("[Marketplace] Getting plugin details: {}", package_name);

    let service = get_marketplace_service()
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // Search for the specific package
    let result = service.search_plugins(&package_name, None, 1, 1, &handle)?;

    result.plugins
        .into_iter()
        .find(|p| p.id == package_name)
        .ok_or_else(|| format!("Plugin not found: {}", package_name))
}

/// Get installed npm plugins from package.json
/// 使用 ETP 协议严格验证元数据
#[tauri::command]
pub fn get_installed_plugins(handle: AppHandle) -> Result<Vec<Plugin>, String> {
    let start_total = std::time::Instant::now();
    println!("[Marketplace] ===== get_installed_plugins command called =====");

    // 1. 获取插件目录
    let plugins_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))?
        .join("plugins");

    // 2. 确保 plugins 目录存在
    std::fs::create_dir_all(&plugins_dir)
        .map_err(|e| format!("Failed to create plugins dir: {}", e))?;

    let package_json_path = plugins_dir.join("package.json");

    // 3. 如果 package.json 不存在，创建一个空的
    if !package_json_path.exists() {
        let empty_package = r#"{
  "name": "etools-plugins",
  "version": "1.0.0",
  "description": "Installed plugins registry",
  "dependencies": {}
}"#;
        std::fs::write(&package_json_path, empty_package)
            .map_err(|e| format!("Failed to create package.json: {}", e))?;
    }

    // 4. 读取 package.json（核心优化）
    let start_read = std::time::Instant::now();
    let package_json_content = std::fs::read_to_string(&package_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;
    println!("[Marketplace] Read package.json: {:?}", start_read.elapsed());

    // 5. 解析 JSON
    let start_parse = std::time::Instant::now();
    let package_data: serde_json::Value = serde_json::from_str(&package_json_content)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;
    println!("[Marketplace] Parse JSON: {:?}", start_parse.elapsed());

    // 6. 获取 dependencies 对象
    let dependencies = package_data["dependencies"]
        .as_object()
        .ok_or("Invalid package.json: missing dependencies")?;

    // 7. 读取每个插件的 package.json 并使用 ETP 协议验证
    let start_load = std::time::Instant::now();
    let mut plugins = Vec::new();

    println!("[Marketplace] Found {} dependencies in package.json", dependencies.len());
    for (package_name, _version) in dependencies.iter() {
        println!("[Marketplace] Processing dependency: {}", package_name);

        // 插件路径：plugins/node_modules/{package_name}
        let plugin_path = plugins_dir
            .join("node_modules")
            .join(package_name);

        let package_json_path = plugin_path.join("package.json");

        // 必须存在 package.json
        if !package_json_path.exists() {
            println!(
                "[Marketplace] ⚠️  Skipping '{}': package.json not found (ETP violation)",
                package_name
            );
            continue;
        }

        println!("[Marketplace] Reading package.json for {}", package_name);
        let plugin_package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json for {}: {}", package_name, e))?;

        let plugin_data: serde_json::Value = serde_json::from_str(&plugin_package_json_content)
            .map_err(|e| format!("Failed to parse package.json for {}: {}", package_name, e))?;

        // 使用 ETP 协议严格验证元数据
        let metadata = match EtoolsMetadata::from_package_json(&plugin_data) {
            Ok(meta) => meta,
            Err(e) => {
                println!(
                    "[Marketplace] ⚠️  Skipping '{}': invalid ETP metadata - {}",
                    package_name, e
                );
                continue;
            }
        };

        println!(
            "[Marketplace] ✅ Loaded plugin: {} ({})",
            metadata.display_name, metadata.id
        );

        // 从 plugin-state.json 读取启用状态
        let enabled = crate::cmds::plugins::get_plugin_enabled_state(&handle, &metadata.id)
            .unwrap_or(true); // 默认启用

        let entry_point = plugin_data["main"]
            .as_str()
            .unwrap_or("index.js")
            .to_string();

        // 构造 Plugin 对象（使用 ETP 元数据）
        let plugin = Plugin {
            id: metadata.id.clone(),
            name: metadata.display_name.clone(),  // ← 使用 displayName
            version: plugin_data["version"]
                .as_str()
                .unwrap_or("0.0.0")
                .to_string(),
            description: metadata.description
                .unwrap_or_else(|| {
                    plugin_data["description"]
                        .as_str()
                        .unwrap_or("")
                        .to_string()
                }),
            author: plugin_data["author"]
                .as_str()
                .map(|s| s.to_string()),
            enabled,
            permissions: metadata.permissions,
            entry_point: entry_point.clone(),
            triggers: metadata.triggers
                .iter()
                .map(|keyword| PluginTrigger {
                    keyword: keyword.clone(),
                    description: String::new(),
                    hotkey: None,
                })
                .collect(),
            settings: plugin_data["settings"]
                .as_object()
                .map(|obj| {
                    obj.iter()
                        .map(|(k, v)| (k.clone(), v.clone()))
                        .collect()
                })
                .unwrap_or_default(),
            health: PluginHealth {
                status: PluginHealthStatus::Healthy,
                message: None,
                last_checked: 0,
                errors: Vec::new(),
            },
            usage_stats: PluginUsageStats {
                last_used: None,
                usage_count: 0,
                last_execution_time: None,
                average_execution_time: None,
            },
            installed_at: std::fs::metadata(&plugin_path)
                .and_then(|m| m.created())
                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64)
                .unwrap_or(0),
            install_path: plugin_path.join(&entry_point).to_string_lossy().to_string(),
            source: PluginSource::Marketplace,
            update_metadata: None,
        };

        plugins.push(plugin);
    }

    println!("[Marketplace] Load {} plugin details: {:?}", plugins.len(), start_load.elapsed());
    println!("[Marketplace] ✅ Total time: {:?}", start_total.elapsed());

    Ok(plugins)
}
