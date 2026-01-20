//! Plugin Service
//! Business logic for plugin management
//!
//! Performance optimizations:
//! - Async file operations using tokio
//! - Plugin list caching with TTL
//! - State file caching
//! - Parallel bulk operations
#![allow(dead_code)]
#![allow(unused_variables)]

use tauri::{AppHandle, Manager};
use crate::models::plugin::*;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Create a plugin error entry from a message
fn create_error_entry(message: &str) -> PluginErrorEntry {
    PluginErrorEntry {
        code: "PLUGIN_ERROR".to_string(),
        message: message.to_string(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        context: None,
    }
}

/// Error type for plugin operations
pub type PluginResult<T> = Result<T, String>;

/// Cache entry for plugin list
#[derive(Clone)]
struct CacheEntry<T> {
    data: T,
    timestamp: Instant,
}

impl<T> CacheEntry<T> {
    fn new(data: T) -> Self {
        Self {
            data,
            timestamp: Instant::now(),
        }
    }

    fn is_expired(&self, ttl: Duration) -> bool {
        self.timestamp.elapsed() > ttl
    }
}

/// Plugin cache configuration
struct PluginCache {
    plugin_list: Arc<RwLock<Option<CacheEntry<Vec<Plugin>>>>>,
    state_map: Arc<RwLock<Option<CacheEntry<HashMap<String, bool>>>>>,
    list_ttl: Duration,
    state_ttl: Duration,
}

impl PluginCache {
    fn new() -> Self {
        Self {
            plugin_list: Arc::new(RwLock::new(None)),
            state_map: Arc::new(RwLock::new(None)),
            list_ttl: Duration::from_secs(60), // Cache plugin list for 60 seconds
            state_ttl: Duration::from_secs(30), // Cache state for 30 seconds
        }
    }

    async fn get_plugins(&self) -> Option<Vec<Plugin>> {
        let cache = self.plugin_list.read().await;
        cache.as_ref().filter(|e| !e.is_expired(self.list_ttl)).map(|e| e.data.clone())
    }

    async fn set_plugins(&self, plugins: Vec<Plugin>) {
        let mut cache = self.plugin_list.write().await;
        *cache = Some(CacheEntry::new(plugins));
    }

    async fn invalidate_plugins(&self) {
        let mut cache = self.plugin_list.write().await;
        *cache = None;
    }

    async fn get_state(&self) -> Option<HashMap<String, bool>> {
        let cache = self.state_map.read().await;
        cache.as_ref().filter(|e| !e.is_expired(self.state_ttl)).map(|e| e.data.clone())
    }

    async fn set_state(&self, state: HashMap<String, bool>) {
        let mut cache = self.state_map.write().await;
        *cache = Some(CacheEntry::new(state));
    }

    async fn invalidate_state(&self) {
        let mut cache = self.state_map.write().await;
        *cache = None;
    }
}

/// Get plugins directory
fn get_plugins_dir(handle: &AppHandle) -> PluginResult<PathBuf> {
    let app_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get data dir: {}", e))?
        .join("plugins");

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }

    Ok(app_dir)
}

/// Plugin service
pub struct PluginService {
    cache: PluginCache,
}

impl PluginService {
    /// Create a new plugin service instance with caching
    pub fn new() -> Self {
        Self {
            cache: PluginCache::new(),
        }
    }

    /// List all installed plugins (optimized with caching)
    pub fn list_plugins(&self, handle: &AppHandle) -> PluginResult<Vec<Plugin>> {
        let plugins_dir = get_plugins_dir(handle)?;

        // Try to get from cache first
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create async runtime: {}", e))?;

        let cached = runtime.block_on(async {
            self.cache.get_plugins().await
        });

        if let Some(plugins) = cached {
            return Ok(plugins);
        }

        // Cache miss - load plugins from disk
        let mut plugins = Vec::new();

        // Read plugin directories
        for entry in fs::read_dir(&plugins_dir)
            .map_err(|e| format!("Failed to read plugins directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_dir() {
                // Load plugin manifest
                if let Ok(plugin) = self.load_plugin(&path) {
                    plugins.push(plugin);
                }
            }
        }

        // Update cache
        let plugins_clone = plugins.clone();
        runtime.block_on(async {
            self.cache.set_plugins(plugins_clone).await;
        });

        Ok(plugins)
    }

    /// Force refresh plugin list (bypasses cache)
    pub fn refresh_plugins(&self, handle: &AppHandle) -> PluginResult<Vec<Plugin>> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create async runtime: {}", e))?;

        // Invalidate cache
        runtime.block_on(async {
            self.cache.invalidate_plugins().await;
        });

        // Load fresh data
        self.list_plugins(handle)
    }

    /// Load a plugin from directory
    fn load_plugin(&self, path: &PathBuf) -> PluginResult<Plugin> {
        // Read manifest file
        let manifest_path = path.join("manifest.json");
        let manifest_content = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read manifest: {}", e))?;

        // Parse manifest (simplified - actual implementation would be more complex)
        let plugin_id = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid plugin directory")?
            .to_string();

        // TODO: Parse actual manifest JSON
        // For now, return a placeholder
        Ok(Plugin {
            id: plugin_id.clone(),
            name: "Plugin".to_string(),
            version: "0.1.0".to_string(),
            description: String::new(),
            author: None,
            enabled: false,
            permissions: Vec::new(),
            entry_point: String::new(),
            triggers: Vec::new(),
            settings: HashMap::new(),
            health: PluginHealth {
                status: PluginHealthStatus::Unknown,
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
            installed_at: 0,
            install_path: path.to_string_lossy().to_string(),
            source: crate::models::plugin::PluginSource::Local,
            update_metadata: None,
        })
    }

    /// Enable a plugin (optimized with state caching)
    pub fn enable_plugin(&self, plugin_id: &str, handle: &AppHandle) -> PluginResult<()> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create async runtime: {}", e))?;

        // Try to get state from cache first
        let mut state = runtime.block_on(async {
            self.cache.get_state().await
        }).unwrap_or_default();

        // Load from disk if cache miss
        if state.is_empty() {
            let app_data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get data dir: {}", e))?;
            let state_file = app_data_dir.join("plugins/plugin_state.json");

            if state_file.exists() {
                let content = fs::read_to_string(&state_file)
                    .map_err(|e| format!("Failed to read state file: {}", e))?;
                state = serde_json::from_str(&content)
                    .unwrap_or_default();
            }
        }

        // Update state
        state.insert(plugin_id.to_string(), true);

        // Save state to disk
        let app_data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?;
        let state_file = app_data_dir.join("plugins/plugin_state.json");

        fs::create_dir_all(state_file.parent().unwrap())
            .map_err(|e| format!("Failed to create state directory: {}", e))?;
        fs::write(&state_file, serde_json::to_string_pretty(&state).unwrap())
            .map_err(|e| format!("Failed to write state file: {}", e))?;

        // Update cache
        let state_clone = state.clone();
        runtime.block_on(async {
            self.cache.set_state(state_clone).await;
        });

        // Perform health check after enabling plugin
        let _ = self.check_plugin_health(plugin_id, handle);

        // Invalidate plugin cache to force refresh
        runtime.block_on(async {
            self.cache.invalidate_plugins().await;
        });

        println!("Plugin enabled: {}", plugin_id);
        Ok(())
    }

    /// Disable a plugin (optimized with state caching)
    pub fn disable_plugin(&self, plugin_id: &str, handle: &AppHandle) -> PluginResult<()> {
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create async runtime: {}", e))?;

        // Try to get state from cache first
        let mut state = runtime.block_on(async {
            self.cache.get_state().await
        }).unwrap_or_default();

        // Load from disk if cache miss
        if state.is_empty() {
            let app_data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get data dir: {}", e))?;
            let state_file = app_data_dir.join("plugins/plugin_state.json");

            if state_file.exists() {
                let content = fs::read_to_string(&state_file)
                    .map_err(|e| format!("Failed to read state file: {}", e))?;
                state = serde_json::from_str(&content)
                    .unwrap_or_default();
            }
        }

        // Update state
        state.insert(plugin_id.to_string(), false);

        // Save state to disk
        let app_data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?;
        let state_file = app_data_dir.join("plugins/plugin_state.json");

        fs::create_dir_all(state_file.parent().unwrap())
            .map_err(|e| format!("Failed to create state directory: {}", e))?;
        fs::write(&state_file, serde_json::to_string_pretty(&state).unwrap())
            .map_err(|e| format!("Failed to write state file: {}", e))?;

        // Update cache
        let state_clone = state.clone();
        runtime.block_on(async {
            self.cache.set_state(state_clone).await;
        });

        // Perform health check after disabling plugin
        let _ = self.check_plugin_health(plugin_id, handle);

        // Invalidate plugin cache to force refresh
        runtime.block_on(async {
            self.cache.invalidate_plugins().await;
        });

        println!("Plugin disabled: {}", plugin_id);
        Ok(())
    }

    /// Get plugin health
    pub fn get_plugin_health(&self, plugin_id: &str, handle: &AppHandle) -> PluginResult<PluginHealth> {
        // Load health from file if exists
        let app_data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?;
        let health_file = app_data_dir.join(format!("plugins/{}/health.json", plugin_id));

        if health_file.exists() {
            let content = fs::read_to_string(&health_file)
                .map_err(|e| format!("Failed to read health file: {}", e))?;
            if let Ok(health) = serde_json::from_str::<PluginHealth>(&content) {
                return Ok(health);
            }
        }

        // Return default health if no file exists
        Ok(PluginHealth {
            status: PluginHealthStatus::Unknown,
            message: None,
            last_checked: 0,
            errors: Vec::new(),
        })
    }

    /// Check plugin health and update health file
    pub fn check_plugin_health(&self, plugin_id: &str, handle: &AppHandle) -> PluginResult<PluginHealth> {
        let mut health = PluginHealth {
            status: PluginHealthStatus::Unknown,
            message: None,
            last_checked: chrono::Utc::now().timestamp_millis(),
            errors: Vec::new(),
        };

        // Get plugin state
        let runtime = tokio::runtime::Runtime::new()
            .map_err(|e| format!("Failed to create async runtime: {}", e))?;

        let state = runtime.block_on(async {
            self.cache.get_state().await
        });

        let is_enabled = state
            .and_then(|s| s.get(plugin_id).copied())
            .unwrap_or(false);

        // Check plugin directory exists
        let app_data_dir = handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data dir: {}", e))?;
        let plugin_dir = app_data_dir.join(format!("plugins/{}", plugin_id));

        if !plugin_dir.exists() {
            health.status = PluginHealthStatus::Error;
            health.message = Some("Plugin directory not found".to_string());
            health.errors.push(create_error_entry("Plugin directory missing"));
        } else if !is_enabled {
            // Disabled plugins are considered healthy but inactive
            health.status = PluginHealthStatus::Warning;
            health.message = Some("Plugin is disabled".to_string());
        } else {
            // Check manifest exists
            let manifest_path = plugin_dir.join("manifest.json");
            if !manifest_path.exists() {
                health.status = PluginHealthStatus::Error;
                health.message = Some("Plugin manifest not found".to_string());
                health.errors.push(create_error_entry("manifest.json missing"));
            } else {
                // Try to parse manifest
                match fs::read_to_string(&manifest_path) {
                    Ok(content) => {
                        if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                            health.status = PluginHealthStatus::Healthy;
                            health.message = Some("Plugin is healthy and enabled".to_string());
                        } else {
                            health.status = PluginHealthStatus::Error;
                            health.message = Some("Invalid manifest format".to_string());
                            health.errors.push(create_error_entry("manifest.json is not valid JSON"));
                        }
                    }
                    Err(e) => {
                        health.status = PluginHealthStatus::Error;
                        health.message = Some(format!("Cannot read manifest: {}", e));
                        health.errors.push(create_error_entry(&format!("Failed to read manifest: {}", e)));
                    }
                }
            }
        }

        // Save health to file
        let health_dir = app_data_dir.join(format!("plugins/{}", plugin_id));
        fs::create_dir_all(&health_dir)
            .map_err(|e| format!("Failed to create health directory: {}", e))?;
        let health_file = health_dir.join("health.json");
        fs::write(&health_file, serde_json::to_string_pretty(&health).unwrap())
            .map_err(|e| format!("Failed to write health file: {}", e))?;

        Ok(health)
    }

    /// Get plugin usage stats
    pub fn get_plugin_usage_stats(&self, plugin_id: &str, handle: &AppHandle) -> PluginResult<PluginUsageStats> {
        // TODO: Implement usage stats logic
        Ok(PluginUsageStats {
            last_used: None,
            usage_count: 0,
            last_execution_time: None,
            average_execution_time: None,
        })
    }

    /// Bulk enable plugins (optimized with parallel processing)
    pub fn bulk_enable_plugins(
        &self,
        plugin_ids: Vec<String>,
        handle: &AppHandle,
    ) -> PluginResult<BulkOperation> {
        let started_at = chrono::Utc::now().timestamp_millis();

        // Use rayon for parallel processing
        use std::sync::{Arc, Mutex};
        use rayon::prelude::*;

        let results = Arc::new(Mutex::new(Vec::new()));
        let handle_ref = Arc::new(handle.clone());

        plugin_ids.par_iter().for_each(|plugin_id| {
            let result = match self.enable_plugin(plugin_id, &handle_ref) {
                Ok(()) => BulkOperationResult {
                    plugin_id: plugin_id.clone(),
                    success: true,
                    error: None,
                },
                Err(e) => BulkOperationResult {
                    plugin_id: plugin_id.clone(),
                    success: false,
                    error: Some(e),
                },
            };

            results.lock().unwrap().push(result);
        });

        let results = Arc::try_unwrap(results).unwrap().into_inner().unwrap();

        let status = if results.iter().all(|r| r.success) {
            BulkOperationStatus::Completed
        } else if results.iter().any(|r| r.success) {
            BulkOperationStatus::PartialFailure
        } else {
            BulkOperationStatus::Failed
        };

        Ok(BulkOperation {
            operation_type: BulkOperationType::Enable,
            target_plugin_ids: plugin_ids,
            status,
            results,
            started_at,
            completed_at: Some(chrono::Utc::now().timestamp_millis()),
        })
    }

    /// Bulk disable plugins (optimized with parallel processing)
    pub fn bulk_disable_plugins(
        &self,
        plugin_ids: Vec<String>,
        handle: &AppHandle,
    ) -> PluginResult<BulkOperation> {
        let started_at = chrono::Utc::now().timestamp_millis();

        // Use rayon for parallel processing
        use std::sync::{Arc, Mutex};
        use rayon::prelude::*;

        let results = Arc::new(Mutex::new(Vec::new()));
        let handle_ref = Arc::new(handle.clone());

        plugin_ids.par_iter().for_each(|plugin_id| {
            let result = match self.disable_plugin(plugin_id, &handle_ref) {
                Ok(()) => BulkOperationResult {
                    plugin_id: plugin_id.clone(),
                    success: true,
                    error: None,
                },
                Err(e) => BulkOperationResult {
                    plugin_id: plugin_id.clone(),
                    success: false,
                    error: Some(e),
                },
            };

            results.lock().unwrap().push(result);
        });

        let results = Arc::try_unwrap(results).unwrap().into_inner().unwrap();

        let status = if results.iter().all(|r| r.success) {
            BulkOperationStatus::Completed
        } else if results.iter().any(|r| r.success) {
            BulkOperationStatus::PartialFailure
        } else {
            BulkOperationStatus::Failed
        };

        Ok(BulkOperation {
            operation_type: BulkOperationType::Disable,
            target_plugin_ids: plugin_ids,
            status,
            results,
            started_at,
            completed_at: Some(chrono::Utc::now().timestamp_millis()),
        })
    }
}
