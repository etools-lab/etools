//! NPM-based Marketplace Service
//! Business logic for plugin marketplace using npm registry
//!
//! This replaces custom marketplace with npm-based plugin distribution.
//! Uses ETP (etools Plugin Metadata Protocol) for strict validation.

use tauri::{AppHandle, Emitter, Manager};
use crate::models::plugin::*;
use crate::models::plugin_metadata::EtoolsMetadata;
use std::process::Command;
use serde_json::Value;

/// Error type for marketplace operations
pub type MarketplaceResult<T> = Result<T, String>;

/// NPM registry search API endpoint
const NPM_SEARCH_API: &str = "https://registry.npmjs.org/-/v1/search";
/// NPM registry API endpoint (reserved for future use)
#[allow(dead_code)]
const NPM_REGISTRY_API: &str = "https://registry.npmjs.org";

/// Marketplace service (npm-based)
pub struct MarketplaceService {
    // Add any required fields here (e.g., http client)
}

impl MarketplaceService {
    /// Create a new marketplace service instance
    pub fn new() -> Self {
        Self {}
    }

    /// List marketplace plugins from npm
    pub fn list_plugins(
        &self,
        category: Option<&str>,
        page: u32,
        page_size: u32,
        _handle: &AppHandle,
    ) -> MarketplaceResult<MarketplacePluginPage> {
        // Search npm for etools-plugin packages
        let search_query = "keywords:etools-plugin";
        let from = (page.saturating_sub(1) * page_size) as usize;

        let url = format!(
            "{}?text={}&size={}&from={}",
            NPM_SEARCH_API,
            urlencoding::encode(search_query),
            page_size,
            from
        );

        let response = self.npm_search(&url)?;

        let total = response.total as u32;
        let object_count = response.objects.len();
        let has_more = (from + object_count) < total as usize;
        let plugins = self.convert_npm_to_marketplace(response.objects, category);

        Ok(MarketplacePluginPage {
            plugins,
            total,
            page,
            page_size,
            has_more,
        })
    }

    /// Search marketplace plugins on npm
    pub fn search_plugins(
        &self,
        query: &str,
        category: Option<&str>,
        page: u32,
        page_size: u32,
        _handle: &AppHandle,
    ) -> MarketplaceResult<MarketplacePluginPage> {
        // Search npm with query
        let search_query = format!("{} keywords:etools-plugin", query);
        let from = (page.saturating_sub(1) * page_size) as usize;

        let url = format!(
            "{}?text={}&size={}&from={}",
            NPM_SEARCH_API,
            urlencoding::encode(&search_query),
            page_size,
            from
        );

        let response = self.npm_search(&url)?;

        let total = response.total as u32;
        let object_count = response.objects.len();
        let has_more = (from + object_count) < total as usize;
        let plugins = self.convert_npm_to_marketplace(response.objects, category);

        Ok(MarketplacePluginPage {
            plugins,
            total,
            page,
            page_size,
            has_more,
        })
    }

    /// Perform npm search
    fn npm_search(&self, url: &str) -> MarketplaceResult<NpmSearchResponse> {
        println!("[Marketplace] Fetching from: {}", url);

        let client = reqwest::blocking::Client::builder()
            .user_agent("etools-marketplace/1.0.0")
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client.get(url)
            .send()
            .map_err(|e| format!("Failed to fetch from npm: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("NPM API returned status: {}", response.status()));
        }

        let body = response.text().map_err(|e| format!("Failed to read response body: {}", e))?;

        let search_response: NpmSearchResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse npm response: {}", e))?;

        Ok(search_response)
    }

    /// Fetch complete package.json from npm registry
    fn fetch_package_json(&self, package_name: &str) -> MarketplaceResult<Value> {
        let url = format!("{}/{}", NPM_REGISTRY_API, package_name);
        println!("[Marketplace] Fetching package.json from: {}", url);

        let client = reqwest::blocking::Client::builder()
            .user_agent("etools-marketplace/1.0.0")
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client.get(&url)
            .send()
            .map_err(|e| format!("Failed to fetch package.json: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("NPM registry returned status: {}", response.status()));
        }

        let body = response.text().map_err(|e| format!("Failed to read package.json: {}", e))?;
        let package_info: Value = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        Ok(package_info)
    }

    /// Convert npm packages to marketplace plugins
    /// 使用 ETP 协议严格验证元数据
    /// 需要从 npm registry 获取完整的 package.json 来验证 ETP 元数据
    fn convert_npm_to_marketplace(
        &self,
        objects: Vec<NpmSearchObject>,
        category_filter: Option<&str>,
    ) -> Vec<MarketplacePlugin> {
        objects
            .into_iter()
            .filter_map(|obj| {
                let package = obj.package;

                // 从 npm registry 获取完整的 package.json（包含 etools 字段）
                let package_info = match self.fetch_package_json(&package.name) {
                    Ok(info) => info,
                    Err(e) => {
                        println!(
                            "[Marketplace] ⚠️  Failed to fetch package.json for '{}': {}",
                            package.name, e
                        );
                        return None;
                    }
                };

                // 提取最新版本的 package.json
                let latest_version = package_info.get("dist-tags")
                    .and_then(|tags| tags.get("latest"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(&package.version);

                let version_data = package_info.get("versions")
                    .and_then(|versions| versions.get(latest_version));

                let version_json = match version_data {
                    Some(v) => v,
                    None => {
                        println!(
                            "[Marketplace] ⚠️  Package '{}' missing version data for '{}'",
                            package.name, latest_version
                        );
                        return None;
                    }
                };

                // 使用 ETP 协议解析元数据（严格模式，不符合协议的包将被过滤）
                let metadata = match EtoolsMetadata::from_package_json(version_json) {
                    Ok(meta) => meta,
                    Err(e) => {
                        println!(
                            "[Marketplace] ⚠️  Skipping package '{}' - invalid ETP metadata: {}",
                            package.name, e
                        );
                        return None;
                    }
                };

                // 分类过滤
                if let Some(cat) = category_filter {
                    if cat != "all" {
                        let category_str = format!("{:?}", metadata.category);
                            if category_str.to_lowercase() != cat {
                            return None;
                        }
                    }
                }

                println!(
                    "[Marketplace] ✅ Loaded plugin: {} ({})",
                    metadata.display_name, metadata.id
                );

                Some(MarketplacePlugin {
                    id: metadata.id.clone(),
                    name: metadata.display_name.clone(),
                    version: latest_version.to_string(),
                    description: metadata.description
                        .unwrap_or_else(|| package.description.clone()),
                    author: Self::extract_author(&package),
                    permissions: metadata.permissions,
                    triggers: metadata.triggers,
                    icon: metadata.icon,
                    homepage: metadata.homepage,
                    repository: None,
                    download_count: 0, // npm search doesn't provide this
                    rating: 0.0,       // npm search doesn't provide this
                    rating_count: 0,
                    category: metadata.category,
                    installed: false,
                    installed_version: None,
                    update_available: false,
                    latest_version: latest_version.to_string(),
                    screenshots: metadata.screenshots,
                    tags: package.keywords,
                    published_at: 0,
                    updated_at: 0,
                })
            })
            .collect()
    }

    /// Extract author from package
    fn extract_author(package: &NpmPackage) -> String {
        // npm author can be a string or an object
        match &package.author {
            serde_json::Value::String(name) => name.clone(),
            serde_json::Value::Object(author_obj) => {
                // Extract name from author object
                author_obj
                    .get("name")
                    .and_then(|v| v.as_str())
                    .map(String::from)
                    .unwrap_or_else(|| {
                        // Fallback to string representation
                        format!("{:?}", author_obj)
                    })
            }
            _ => "Unknown".to_string(),
        }
    }

    /// List installed npm plugins
    pub fn list_installed_plugins(
        &self,
        handle: &AppHandle,
    ) -> MarketplaceResult<Vec<Plugin>> {
        let plugins_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
            .join("plugins");

        let plugins_json_path = plugins_dir.join("package.json");

        // If package.json doesn't exist, create an empty one
        if !plugins_json_path.exists() {
            let empty_package = r#"{
  "name": "etools-plugins",
  "version": "1.0.0",
  "description": "Installed plugins registry",
  "dependencies": {}
}"#;
            std::fs::write(&plugins_json_path, empty_package)
                .map_err(|e| format!("Failed to create package.json: {}", e))?;
        }

        // Read package.json (core optimization)
        let package_json_content = std::fs::read_to_string(&plugins_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        // Parse JSON
        let package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // Get dependencies object
        let dependencies = package_data["dependencies"]
            .as_object()
            .ok_or("Invalid package.json: missing dependencies")?;

        // Read each plugin's plugin.json
        let mut plugins = Vec::new();

        println!("[Marketplace] Found {} dependencies in package.json", dependencies.len());
        for (package_name, _version) in dependencies.iter() {
            println!("[Marketplace] Processing dependency: {}", package_name);
            // Plugin path: plugins/node_modules/{package_name}
            // package_name might be "@etools-plugin/devtools" or "devtools"
            let plugin_path = plugins_dir
                .join("node_modules")
                .join(package_name);

            let plugin_json_path = plugin_path.join("plugin.json");
            let package_json_path = plugin_path.join("package.json");

            // Try to read plugin.json, if not exist then read package.json
            let (plugin_json_content, is_package_json) = if plugin_json_path.exists() {
                println!("[Marketplace] Reading plugin.json for {}", package_name);
                (std::fs::read_to_string(&plugin_json_path)
                    .map_err(|e| format!("Failed to read plugin.json for {}: {}", package_name, e))?, false)
            } else if package_json_path.exists() {
                println!("[Marketplace] plugin.json not found, reading package.json for {}", package_name);
                (std::fs::read_to_string(&package_json_path)
                    .map_err(|e| format!("Failed to read package.json for {}: {}", package_name, e))?, true)
            } else {
                println!("[Marketplace] Warning: neither plugin.json nor package.json found for {}", package_name);
                continue;
            };

            let mut plugin_data: serde_json::Value = serde_json::from_str(&plugin_json_content)
                .map_err(|e| format!("Failed to parse plugin JSON for {}: {}", package_name, e))?;

            // If reading package.json, try to get etools metadata
            if is_package_json {
                // Clone etools metadata to avoid borrowing conflict
                let etools_meta_clone: Option<std::collections::HashMap<String, serde_json::Value>> =
                    plugin_data.get("etools")
                        .and_then(|v| v.as_object())
                        .map(|obj| {
                            obj.iter()
                                .map(|(k, v)| (k.clone(), v.clone()))
                                .collect()
                        });

                if let Some(etools_meta) = etools_meta_clone {
                    println!("[Marketplace] Using etools metadata from package.json for {}", package_name);
                    // Merge etools metadata to top-level as fallback values
                    // Plugin manifest (from source code) is the source of truth
                    // These values are only used if manifest cannot be loaded
                    for (key, value) in etools_meta.iter() {
                        if plugin_data.get(key).is_none() {
                            plugin_data[key] = value.clone();
                        }
                    }
                }
            }

            // Construct Plugin object from plugin.json
            // Read plugin enabled state
            let plugin_id = plugin_data["name"].as_str().unwrap_or(package_name);

            let enabled = crate::cmds::plugins::get_plugin_enabled_state(handle, &plugin_id.to_string())
                .unwrap_or(true); // Default to enabled

            let entry_point = plugin_data["main"].as_str().unwrap_or("index.js");

            let plugin = Plugin {
                id: plugin_id.to_string(),
                name: plugin_data["name"].as_str().unwrap_or(package_name).to_string(),
                version: plugin_data["version"].as_str().unwrap_or("0.0.0").to_string(),
                description: plugin_data["description"].as_str().unwrap_or("").to_string(),
                author: plugin_data["author"].as_str().map(|s| s.to_string()),
                enabled, // Read from plugin-state.json
                permissions: plugin_data["permissions"]
                    .as_array()
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                    .unwrap_or_default(),
                entry_point: entry_point.to_string(),
                triggers: plugin_data["triggers"]
                    .as_array()
                    .map(|arr| arr.iter().map(|v| PluginTrigger {
                        keyword: v.as_str().unwrap_or("").to_string(),
                        description: "".to_string(),
                        hotkey: None,
                    }).collect())
                    .unwrap_or_default(),
                settings: plugin_data["settings"]
                    .as_object()
                    .map(|obj| obj.iter().map(|(k, v)| {
                        (k.clone(), v.clone())
                    }).collect())
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

        println!("[Marketplace] Found {} installed npm plugins", plugins.len());
        Ok(plugins)
    }

    /// Install a plugin from marketplace
    pub fn install_plugin(
        &self,
        package_name: &str,
        handle: &AppHandle,
    ) -> MarketplaceResult<Plugin> {
        println!("[Marketplace] Installing plugin: {}", package_name);

        // 1. Get plugins directory
        let plugins_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        // 2. Ensure plugins directory exists
        std::fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins dir: {}", e))?;

        let package_json_path = plugins_dir.join("package.json");

        // 3. Check if package.json exists
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

        // 4. Read current package.json
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        let mut package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // 5. Get or create dependencies object
        let dependencies = if package_data.get_mut("dependencies").is_none() {
            package_data["dependencies"] = serde_json::json!({});
            package_data.get_mut("dependencies").unwrap()
        } else {
            package_data.get_mut("dependencies").unwrap()
        };

        // 6. Check if plugin already exists
        if dependencies.get(package_name).is_some() {
            return Err(format!("Plugin {} already installed", package_name));
        }

        // 7. Add plugin as dependency with "latest" version
        dependencies[package_name] = serde_json::json!("latest");

        // 8. Write updated package.json
        let updated_json = serde_json::to_string_pretty(&package_data)
            .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

        std::fs::write(&package_json_path, updated_json)
            .map_err(|e| format!("Failed to write package.json: {}", e))?;

        // 9. Run npm install (in plugins directory, not node_modules)
        let output = Command::new("npm")
            .current_dir(&plugins_dir)
            .args(["install", package_name])
            .output()
            .map_err(|e| format!("Failed to execute npm install: {}", e))?;

        if !output.status.success() {
            return Err(format!("npm install failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        println!("[Marketplace] npm install output:\n{}", String::from_utf8_lossy(&output.stdout));

        // 10. Read plugin package.json
        let node_modules_dir = plugins_dir.join("node_modules");
        let plugin_path = node_modules_dir.join(package_name);
        let plugin_package_json_path = plugin_path.join("package.json");
        let plugin_package_json_content = std::fs::read_to_string(&plugin_package_json_path)
            .map_err(|e| format!("Failed to read plugin package.json: {}", e))?;

        let plugin_data: serde_json::Value = serde_json::from_str(&plugin_package_json_content)
            .map_err(|e| format!("Failed to parse plugin package.json: {}", e))?;

        // 11. Get plugin enabled state
        let enabled = crate::cmds::plugins::get_plugin_enabled_state(handle, package_name)
            .unwrap_or(true);

        let entry_point = plugin_data["main"].as_str().unwrap_or("index.js");

        // 12. Construct Plugin object
        let plugin = Plugin {
            id: package_name.to_string(),
            name: plugin_data["name"].as_str().unwrap_or(package_name).to_string(),
            version: plugin_data["version"].as_str().unwrap_or("0.0.0").to_string(),
            description: plugin_data["description"].as_str().unwrap_or("").to_string(),
            author: plugin_data["author"].as_str().map(|s| s.to_string()),
            enabled,
            permissions: plugin_data["permissions"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            entry_point: entry_point.to_string(),
            triggers: plugin_data["triggers"]
                .as_array()
                .map(|arr| arr.iter().map(|v| PluginTrigger {
                    keyword: v.as_str().unwrap_or("").to_string(),
                    description: "".to_string(),
                    hotkey: None,
                }).collect())
                .unwrap_or_default(),
            settings: plugin_data["settings"]
                .as_object()
                .map(|obj| obj.iter().map(|(k, v)| {
                    (k.clone(), v.clone())
                }).collect())
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

        // 13. Reload plugins
        let _ = handle.emit("plugin-reload-request", ());

        Ok(plugin)
    }

    /// Update an existing plugin
    pub fn update_plugin(&self, package_name: &str, handle: &AppHandle) -> MarketplaceResult<Plugin> {
        println!("[Marketplace] Updating plugin: {}", package_name);

        // 1. Get plugins directory
        let plugins_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        // 2. Run npm install (in plugins directory) to update the package
        let node_modules_dir = plugins_dir.join("node_modules");
        let output = Command::new("npm")
            .current_dir(&node_modules_dir)
            .args(["install", package_name, "--upgrade"])
            .output()
            .map_err(|e| format!("Failed to execute npm install: {}", e))?;

        if !output.status.success() {
            return Err(format!("npm install failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        println!("[Marketplace] npm install output: {}", String::from_utf8_lossy(&output.stdout));

        // 3. Read plugin package.json
        let plugin_path = node_modules_dir.join(package_name);
        let package_json_path = plugin_path.join("package.json");
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        let plugin_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // 4. Get plugin enabled state
        let enabled = crate::cmds::plugins::get_plugin_enabled_state(handle, package_name)
            .unwrap_or(true);

        let entry_point = plugin_data["main"].as_str().unwrap_or("index.js");

        // 5. Construct Plugin object
        let plugin = Plugin {
            id: package_name.to_string(),
            name: plugin_data["name"].as_str().unwrap_or(package_name).to_string(),
            version: plugin_data["version"].as_str().unwrap_or("0.0.0").to_string(),
            description: plugin_data["description"].as_str().unwrap_or("").to_string(),
            author: plugin_data["author"].as_str().map(|s| s.to_string()),
            enabled,
            permissions: plugin_data["permissions"]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            entry_point: entry_point.to_string(),
            triggers: plugin_data["triggers"]
                .as_array()
                .map(|arr| arr.iter().map(|v| PluginTrigger {
                    keyword: v.as_str().unwrap_or("").to_string(),
                    description: "".to_string(),
                    hotkey: None,
                }).collect())
                .unwrap_or_default(),
            settings: plugin_data["settings"]
                .as_object()
                .map(|obj| obj.iter().map(|(k, v)| {
                    (k.clone(), v.clone())
                }).collect())
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

            // 6. Reload plugins
        let _ = handle.emit("plugin-reload-request", ());

        Ok(plugin)
    }

    /// Check for plugin updates
    pub fn check_updates(&self, _handle: &AppHandle) -> MarketplaceResult<Vec<PluginUpdateInfo>> {
        let plugins_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current dir: {}", e))?
            .join("plugins");

        let package_json_path = plugins_dir.join("package.json");

        if !package_json_path.exists() {
            return Ok(vec![]);
        }

        // Read package.json
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        let package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        let dependencies = package_data["dependencies"]
            .as_object()
            .ok_or("Invalid package.json: missing dependencies")?;

        let mut updates = Vec::new();

        // Check each plugin
        for (package_name, version_value) in dependencies.iter() {
            let current_version = version_value.as_str().unwrap_or("0.0.0");

            // Query npm for latest version
            let npm_registry_url = format!(
                "https://registry.npmjs.org/{}",
                package_name
            );

            // Use curl to fetch package info
            let output = Command::new("curl")
                .args(["-s", &npm_registry_url])
                .output()
                .map_err(|e| format!("Failed to fetch package info: {}", e))?;

            let latest_version = if output.status.success() {
                let json = serde_json::from_str::<Value>(&String::from_utf8_lossy(&output.stdout))
                    .unwrap_or_else(|_| serde_json::json!({}));

                json.get("version")
                    .and_then(|v| v.as_str())
                    .unwrap_or("0.0.0")
                    .to_string()
            } else {
                // If curl fails, assume no update
                current_version.to_string()
            };

            // Compare versions
            if latest_version != current_version {
                updates.push(PluginUpdateInfo {
                    package_name: package_name.to_string(),
                    current_version: current_version.to_string(),
                    latest_version,
                    has_update: true,
                });
            }
        }

        println!("[Marketplace] Found {} plugins with updates", updates.len());
        Ok(updates)
    }

    /// Uninstall a plugin
    pub fn uninstall_plugin(&self, package_name: &str, handle: &AppHandle) -> MarketplaceResult<()> {
        println!("[Marketplace] Uninstalling plugin: {}", package_name);

        // 1. Get plugins directory
        let plugins_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        // 2. Read package.json
        let package_json_path = plugins_dir.join("package.json");
        let package_json_content = std::fs::read_to_string(&package_json_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;

        // 3. Parse JSON
        let mut package_data: serde_json::Value = serde_json::from_str(&package_json_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // 4. Get or create dependencies object
        if package_data["dependencies"].is_null() {
            package_data["dependencies"] = serde_json::json!({});
        }

        if let Some(dependencies) = package_data["dependencies"].as_object_mut() {
            dependencies.remove(package_name);
        }

        // 6. Write updated package.json
        let updated_json = serde_json::to_string_pretty(&package_data)
            .map_err(|e| format!("Failed to serialize package.json: {}", e))?;

        std::fs::write(&package_json_path, updated_json)
            .map_err(|e| format!("Failed to write package.json: {}", e))?;

        // 7. Remove plugin files
        let plugin_path = plugins_dir.join("node_modules").join(package_name);
        if plugin_path.exists() {
            std::fs::remove_dir_all(&plugin_path)
                .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;
        }

        // 8. Update plugin state
        let _ = crate::cmds::plugins::remove_plugin_state(handle, package_name);

        // 9. Reload plugins
        let _ = handle.emit("plugin-reload-request", ());

        Ok(())
    }
}

// ============================================================================
// Types for NPM API
// ============================================================================

/// NPM package info from search results
#[derive(Debug, serde::Deserialize)]
struct NpmPackage {
    name: String,
    version: String,
    description: String,
    keywords: Vec<String>,
    // author can be various types
    #[serde(default)]
    author: serde_json::Value,
    // etools metadata (optional, for custom display name, category, etc.)
    #[serde(default)]
    etools: Option<std::collections::HashMap<String, serde_json::Value>>,
}

#[derive(Debug, serde::Deserialize)]
struct NpmSearchObject {
    package: NpmPackage,
}

#[derive(Debug, serde::Deserialize)]
struct NpmSearchResponse {
    objects: Vec<NpmSearchObject>,
    total: u128,
}

#[derive(Debug, serde::Deserialize)]
struct NpmScore {
    #[serde(rename = "final")]
    final_score: f64,
    detail: NpmScoreDetail,
}

#[derive(Debug, serde::Deserialize)]
struct NpmScoreDetail {
    quality: f64,
    popularity: f64,
    maintenance: f64,
}
