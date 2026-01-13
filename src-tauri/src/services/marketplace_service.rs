//! NPM-based Marketplace Service
//! Business logic for plugin marketplace using npm registry
//!
//! This replaces the custom marketplace with npm-based plugin distribution.

use tauri::{AppHandle, Manager};
use crate::models::plugin::*;
use std::fs;
use std::process::Command;
use std::time::SystemTime;
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

    /// Install plugin from npm
    pub fn install_plugin(&self, package_name: &str, handle: &AppHandle) -> MarketplaceResult<Plugin> {
        println!("[Marketplace] Installing plugin: {}", package_name);

        // 1. Get plugins directory
        let plugins_base = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        println!("[Marketplace] Plugins base directory: {:?}", plugins_base);
        fs::create_dir_all(&plugins_base)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;

        // 2. Ensure package.json exists (npm 需要)
        let package_json_path = plugins_base.join("package.json");
        if !package_json_path.exists() {
            println!("[Marketplace] Creating package.json in plugins directory");
            let default_package_json = r#"{"name":"etools-plugins","dependencies":{}}"#;
            fs::write(&package_json_path, default_package_json)
                .map_err(|e| format!("Failed to create package.json: {}", e))?;
        }

        // 3. Execute npm install (在 plugins 目录执行)
        println!("[Marketplace] Running: npm install {}", package_name);
        let output = Command::new("npm")
            .args(["install", package_name])
            .current_dir(&plugins_base)  // 使用 current_dir 而不是 --prefix
            .output()
            .map_err(|e| format!("Failed to execute npm install: {}", e))?;

        println!("[Marketplace] npm install stdout: {}", String::from_utf8_lossy(&output.stdout));
        println!("[Marketplace] npm install stderr: {}", String::from_utf8_lossy(&output.stderr));
        println!("[Marketplace] npm install status: {}", output.status);

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("npm install failed: {}", error));
        }

        println!("[Marketplace] npm install successful");

        // 3. List what was installed
        println!("[Marketplace] Listing contents of {:?}", plugins_base);
        if let Ok(entries) = fs::read_dir(&plugins_base) {
            for entry in entries.flatten() {
                println!("[Marketplace]   - {:?}", entry.file_name());
            }
        }

        // 4. Read package.json from installed package
        // npm install --prefix plugins 会创建 plugins/node_modules 目录
        let node_modules_dir = plugins_base.join("node_modules");
        let package_path = node_modules_dir.join(package_name).join("package.json");

        println!("[Marketplace] Looking for package.json at: {:?}", package_path);
        println!("[Marketplace] Package.json exists: {}", package_path.exists());

        if !package_path.exists() {
            return Err(format!("package.json not found at {:?}", package_path));
        }

        println!("[Marketplace] Using package.json at: {:?}", package_path);
        let package_content = fs::read_to_string(&package_path)
            .map_err(|e| format!("Failed to read package.json from {:?}: {}", package_path, e))?;

        let package_json: Value = serde_json::from_str(&package_content)
            .map_err(|e| format!("Failed to parse package.json: {}", e))?;

        // 4. Extract ETools metadata (optional for compatibility)
        let etools_metadata = package_json.get("etools")
            .and_then(|v| v.as_object());

        // Generate plugin_id from package name if not in etools metadata
        let plugin_id = if let Some(meta) = &etools_metadata {
            meta.get("id")
                .and_then(|v| v.as_str())
                .ok_or("etools.id missing")?
        } else {
            // Generate ID from package name (e.g., "@etools-plugin/devtools" -> "devtools")
            package_name.strip_prefix("@etools-plugin/")
                .unwrap_or(package_name)
        };

        let title = if let Some(meta) = &etools_metadata {
            meta.get("title")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| {
                    package_json.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .to_string()
                })
        } else {
            // Generate title from package name (e.g., "devtools" -> "Devtools")
            package_name.strip_prefix("@etools-plugin/")
                .unwrap_or(package_name)
                .split('-')
                .map(|s| {
                    let mut chars = s.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                    }
                })
                .collect::<Vec<String>>()
                .join(" ")
        };

        let description = if let Some(meta) = &etools_metadata {
            meta.get("description")
                .and_then(|v| v.as_str())
                .unwrap_or_else(|| {
                    package_json.get("description")
                        .and_then(|v| v.as_str())
                        .unwrap_or("No description")
                })
        } else {
            package_json.get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("No description")
        };

        let version = package_json.get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("0.0.0");

        let author = package_json.get("author")
            .and_then(|v| v.as_str())
            .or_else(|| etools_metadata.as_ref().and_then(|m| m.get("author").and_then(|v| v.as_str())))
            .map(String::from);

        let permissions = if let Some(meta) = &etools_metadata {
            meta.get("permissions")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        let triggers: Vec<String> = if let Some(meta) = &etools_metadata {
            meta.get("triggers")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect())
                .unwrap_or_default()
        } else {
            // Generate default triggers from plugin ID
            vec![format!("{}:", plugin_id)]
        };

        let _icon = etools_metadata.as_ref()
            .and_then(|m| m.get("icon"))
            .and_then(|v| v.as_str())
            .map(String::from);

        // TODO: Add homepage, repository, category to Plugin struct when needed
        let _homepage = package_json.get("homepage")
            .and_then(|v| v.as_str())
            .or_else(|| etools_metadata.as_ref().and_then(|m| m.get("homepage").and_then(|v| v.as_str())))
            .map(String::from);

        let _repository = package_json.get("repository")
            .and_then(|v| v.as_str())
            .map(String::from);

        let _category_str = etools_metadata.as_ref()
            .and_then(|m| m.get("category"))
            .and_then(|v| v.as_str())
            .unwrap_or("utilities");
        let _category = Self::parse_category(_category_str);

        // 5. Get entry point
        let main = package_json.get("main")
            .and_then(|v| v.as_str())
            .unwrap_or("dist/index.js");

        // 6. Get current timestamp
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| format!("Failed to get timestamp: {}", e))?
            .as_millis() as i64;

        // 7. Return Plugin object
        Ok(Plugin {
            id: plugin_id.to_string(),
            name: title.to_string(),
            version: version.to_string(),
            description: description.to_string(),
            author,
            enabled: true,
            permissions,
            entry_point: main.to_string(),
            triggers: triggers.iter().map(|t| PluginTrigger {
                keyword: t.clone(),
                description: "".to_string(),
                hotkey: None,
            }).collect(),
            settings: Default::default(),
            health: PluginHealth {
                status: PluginHealthStatus::Healthy,
                message: Some("Installed from npm".to_string()),
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
            install_path: package_path.parent().unwrap().to_string_lossy().to_string(),
            source: PluginSource::Marketplace,
        })
    }

    /// Uninstall plugin using npm
    pub fn uninstall_plugin(&self, package_name: &str, handle: &AppHandle) -> MarketplaceResult<()> {
        println!("[Marketplace] Uninstalling plugin: {}", package_name);

        let plugins_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        // Execute npm uninstall
        let output = Command::new("npm")
            .args(["uninstall", package_name])
            .current_dir(&plugins_dir)  // 使用 current_dir 而不是 --prefix
            .output()
            .map_err(|e| format!("Failed to execute npm uninstall: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("npm uninstall failed: {}", error));
        }

        println!("[Marketplace] npm uninstall successful");
        Ok(())
    }

    /// Update plugin using npm
    pub fn update_plugin(&self, package_name: &str, handle: &AppHandle) -> MarketplaceResult<Plugin> {
        println!("[Marketplace] Updating plugin: {}", package_name);

        let plugins_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?
            .join("plugins");

        // Execute npm update
        let output = Command::new("npm")
            .args(["update", package_name])
            .current_dir(&plugins_dir)  // 使用 current_dir 而不是 --prefix
            .output()
            .map_err(|e| format!("Failed to execute npm update: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("npm update failed: {}", error));
        }

        println!("[Marketplace] npm update successful");

        // Re-read the updated package
        self.install_plugin(package_name, handle)
    }

    /// Check for plugin updates
    pub fn check_updates(&self, _handle: &AppHandle) -> MarketplaceResult<Vec<String>> {
        // TODO: Implement by comparing installed versions with npm registry
        Ok(vec![])
    }

    // ========================================================================
    // Private helper methods
    // ========================================================================

    /// Execute npm search API call
    fn npm_search(&self, url: &str) -> MarketplaceResult<NpmSearchResponse> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client.get(url)
            .header("User-Agent", "ETools/1.0")
            .send()
            .map_err(|e| format!("Failed to fetch from npm: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("npm API returned error: {}", response.status()));
        }

        let text = response.text()
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let search_response: NpmSearchResponse = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse npm response: {}", e))?;

        Ok(search_response)
    }

    /// Convert npm search results to marketplace plugins
    fn convert_npm_to_marketplace(
        &self,
        objects: Vec<NpmSearchObject>,
        category_filter: Option<&str>,
    ) -> Vec<MarketplacePlugin> {
        objects
            .into_iter()
            .filter_map(|obj| {
                let package = obj.package;

                // Filter by category if specified
                if let Some(cat) = category_filter {
                    if cat != "all" {
                        // Try to get category from package keywords or etools metadata
                        let package_cat = package.keywords.iter()
                            .find(|k| {
                                matches!(k.as_str(),
                                    "productivity" | "developer" | "utilities" |
                                    "search" | "media" | "integration"
                                )
                            });

                        if package_cat.map(|k| k.as_str()) != Some(cat) {
                            return None;
                        }
                    }
                }

                // Get etools metadata from package (if available in npm search)
                // For full metadata, we'd need to fetch individual package info
                let name = package.name.clone();
                let id = name.strip_prefix("@etools-plugin/")
                    .unwrap_or(&name)
                    .replace('-', "");

                let version = package.version.clone();
                let description = package.description.clone();

                Some(MarketplacePlugin {
                    id: id.clone(),
                    name: Self::extract_title(&package),
                    version: version.clone(),
                    description,
                    author: Self::extract_author(&package),
                    permissions: vec![],
                    triggers: vec![],
                    icon: None,
                    homepage: None,
                    repository: None,
                    download_count: 0, // npm search doesn't provide this
                    rating: 0.0,       // npm search doesn't provide this
                    rating_count: 0,
                    category: Self::parse_category_from_keywords(&package.keywords),
                    installed: false,
                    installed_version: None,
                    update_available: false,
                    latest_version: version,
                    screenshots: None,
                    tags: package.keywords,
                    published_at: 0,
                    updated_at: 0,
                })
            })
            .collect()
    }

    fn extract_title(package: &NpmPackage) -> String {
        package.name
            .strip_prefix("@etools-plugin/")
            .unwrap_or(&package.name)
            .split('-')
            .map(|s| {
                let mut chars = s.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                }
            })
            .collect::<Vec<String>>()
            .join(" ")
    }

    fn extract_author(_package: &NpmPackage) -> String {
        // npm author can be an object or string
        // For now, return a placeholder
        // TODO: Parse author from package.author when needed
        "Unknown".to_string()
    }

    fn parse_category(category_str: &str) -> PluginCategory {
        match category_str.to_lowercase().as_str() {
            "productivity" => PluginCategory::Productivity,
            "developer" => PluginCategory::Developer,
            "utilities" => PluginCategory::Utilities,
            "search" => PluginCategory::Search,
            "media" => PluginCategory::Media,
            "integration" => PluginCategory::Integration,
            _ => PluginCategory::Utilities,
        }
    }

    fn parse_category_from_keywords(keywords: &[String]) -> PluginCategory {
        for keyword in keywords {
            let cat = Self::parse_category(keyword);
            // Return first valid category that isn't Utilities (default)
            if !matches!(cat, PluginCategory::Utilities) {
                return cat;
            }
        }
        PluginCategory::Utilities
    }

    /// List installed npm plugins
    /// Scans the node_modules directory for installed @etools-plugin packages
    #[allow(dead_code)]
    pub fn list_installed_plugins(&self, handle: &AppHandle) -> MarketplaceResult<Vec<Plugin>> {
        println!("[Marketplace] list_installed_plugins called");

        let app_data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| {
                println!("[Marketplace] Failed to get app data dir: {}", e);
                format!("Failed to get data dir: {}", e)
            })?;

        println!("[Marketplace] App data dir: {:?}", app_data_dir);

        let plugins_dir = app_data_dir.join("plugins/node_modules/@etools-plugin");

        println!("[Marketplace] Plugins dir: {:?}", plugins_dir);
        println!("[Marketplace] Plugins dir exists: {}", plugins_dir.exists());

        let mut plugins = Vec::new();

        // Check if directory exists
        if !plugins_dir.exists() {
            println!("[Marketplace] No plugins directory found: {:?}", plugins_dir);
            return Ok(plugins);
        }

        // Read directory entries
        let entries = fs::read_dir(&plugins_dir)
            .map_err(|e| {
                println!("[Marketplace] Failed to read plugins directory: {}", e);
                format!("Failed to read plugins directory: {}", e)
            })?;

        let entries_vec: Vec<_> = entries.collect();
        println!("[Marketplace] Found {} directory entries", entries_vec.len());

        for entry in entries_vec.into_iter().flatten() {
            let path = entry.path();
            println!("[Marketplace] Processing entry: {:?}", path);

            // Skip non-directories
            if !path.is_dir() {
                println!("[Marketplace] Skipping (not a directory)");
                continue;
            }

            // Read package.json
            let package_json_path = path.join("package.json");
            if !package_json_path.exists() {
                println!("[Marketplace] No package.json found in {:?}", path);
                continue;
            }

            let package_json_content = fs::read_to_string(&package_json_path)
                .map_err(|e| {
                    println!("[Marketplace] Failed to read package.json: {}", e);
                    format!("Failed to read package.json: {}", e)
                })?;

            println!("[Marketplace] Successfully read package.json");

            let package_json: Value = serde_json::from_str(&package_json_content)
                .map_err(|e| {
                    println!("[Marketplace] Failed to parse package.json: {}", e);
                    format!("Failed to parse package.json: {}", e)
                })?;

            println!("[Marketplace] Successfully parsed package.json");

            // Extract etools metadata (optional for compatibility)
            let etools_metadata = package_json
                .get("etools")
                .and_then(|v| v.as_object());

            let package_name = package_json
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown");

            // Generate plugin_id from package name if not in etools metadata
            let plugin_id = if let Some(meta) = &etools_metadata {
                meta.get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_else(|| {
                        path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                    })
                    .to_string()
            } else {
                // Generate from package name (e.g., "@etools-plugin/devtools" -> "devtools")
                package_name.strip_prefix("@etools-plugin/")
                    .unwrap_or(package_name)
                    .to_string()
            };

            let name = if let Some(meta) = &etools_metadata {
                meta.get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or_else(|| {
                        package_json
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown")
                    })
                    .to_string()
            } else {
                // Generate title from package name
                package_name.strip_prefix("@etools-plugin/")
                    .unwrap_or(package_name)
                    .split('-')
                    .map(|s| {
                        let mut chars = s.chars();
                        match chars.next() {
                            None => String::new(),
                            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                        }
                    })
                    .collect::<Vec<String>>()
                    .join(" ")
            };

            let description = if let Some(meta) = &etools_metadata {
                meta.get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or_else(|| {
                        package_json
                            .get("description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                    })
                    .to_string()
            } else {
                package_json
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };

            let version = package_json
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("0.0.0")
                .to_string();

            let author = if let Some(meta) = &etools_metadata {
                meta.get("author")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string()
            } else {
                package_json
                    .get("author")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string()
            };

            // Extract triggers
            let triggers: Vec<String> = if let Some(meta) = &etools_metadata {
                meta.get("triggers")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .map(String::from)
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                // Generate default triggers from plugin ID
                vec![format!("{}:", plugin_id)]
            };

            // Extract permissions as strings
            let permissions: Vec<String> = if let Some(meta) = &etools_metadata {
                meta.get("permissions")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .map(String::from)
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                Vec::new()
            };

            // Convert triggers to PluginTrigger structs
            let plugin_triggers: Vec<PluginTrigger> = triggers
                .iter()
                .map(|keyword| PluginTrigger {
                    keyword: keyword.clone(),
                    description: format!("Trigger: {}", keyword),
                    hotkey: None,
                })
                .collect();

            // Get installation time
            let installed_at = path
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0);

            plugins.push(Plugin {
                id: plugin_id.clone(),
                name,
                version,
                description,
                author: Some(author), // Wrap in Option
                enabled: true, // npm plugins are enabled by default
                permissions,
                entry_point: format!("@etools-plugin/{}", path.file_name().unwrap().to_string_lossy()),
                triggers: plugin_triggers,
                settings: Default::default(),
                health: PluginHealth {
                    status: PluginHealthStatus::Healthy,
                    message: Some("Installed from npm".to_string()),
                    last_checked: SystemTime::now()
                        .duration_since(SystemTime::UNIX_EPOCH)
                        .map(|d| d.as_millis() as i64)
                        .unwrap_or(0),
                    errors: Vec::new(),
                },
                usage_stats: PluginUsageStats {
                    last_used: None,
                    usage_count: 0,
                    last_execution_time: None,
                    average_execution_time: None,
                },
                installed_at: installed_at,
                install_path: path.to_string_lossy().to_string(),
                source: PluginSource::Marketplace,
            });
        }

        println!("[Marketplace] Found {} installed npm plugins", plugins.len());
        Ok(plugins)
    }
}

// ============================================================================
// NPM API Types
// ============================================================================

#[derive(Debug, serde::Deserialize)]
struct NpmSearchResponse {
    objects: Vec<NpmSearchObject>,
    total: usize,
    time: String,
}

#[derive(Debug, serde::Deserialize)]
struct NpmSearchObject {
    package: NpmPackage,
    score: NpmScore,
    searchScore: f64,
}

#[derive(Debug, serde::Deserialize)]
struct NpmPackage {
    name: String,
    version: String,
    description: String,
    keywords: Vec<String>,
    // author can be various types
    #[serde(default)]
    author: serde_json::Value,
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
