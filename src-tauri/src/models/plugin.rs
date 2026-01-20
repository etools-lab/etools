/**
 * Plugin Model
 * Represents an installed plugin and related structures
 */
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Plugin Health
// ============================================================================

/// Plugin health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PluginHealthStatus {
    Healthy,
    Warning,
    Error,
    Unknown,
}

/// Plugin health information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHealth {
    pub status: PluginHealthStatus,
    pub message: Option<String>,
    pub last_checked: i64, // Unix timestamp (ms)
    pub errors: Vec<PluginErrorEntry>,
}

/// Plugin error entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginErrorEntry {
    pub code: String,
    pub message: String,
    pub timestamp: i64, // Unix timestamp (ms)
    pub context: Option<HashMap<String, String>>,
}

// ============================================================================
// Plugin Usage Statistics
// ============================================================================

/// Plugin usage statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginUsageStats {
    pub last_used: Option<i64>, // Unix timestamp (ms)
    pub usage_count: u64,
    pub last_execution_time: Option<u64>,    // ms
    pub average_execution_time: Option<u64>, // ms
}

// ============================================================================
// Plugin (Extended)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub enabled: bool,
    pub permissions: Vec<String>,
    pub entry_point: String,
    pub triggers: Vec<PluginTrigger>,
    pub settings: HashMap<String, serde_json::Value>,
    pub health: PluginHealth,
    pub usage_stats: PluginUsageStats,
    pub installed_at: i64,
    pub install_path: String,
    pub source: PluginSource,
    pub update_metadata: Option<PluginUpdateMetadata>,
}

/// Plugin installation source
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginSource {
    Marketplace,
    Local,
    GithubRelease,
}

/// Plugin installation progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgress {
    pub install_id: String,
    pub stage: String,
    pub progress: u8,
    pub message: String,
}

/// Package validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageValidation {
    pub is_valid: bool,
    pub manifest: Option<PluginManifest>,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

/// Validation error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub code: String,
    pub message: String,
    pub field: Option<String>,
}

/// Validation warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub code: String,
    pub message: String,
    pub field: Option<String>,
}

/// Extraction result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub path: String,
    pub manifest: PluginManifest,
    pub files: Vec<ExtractedFile>,
}

/// Extracted file information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedFile {
    pub path: String,
    pub size: u64,
    pub file_type: String, // "file" or "directory"
}

/// Cancel installation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CancelInstallResponse {
    pub success: bool,
    pub message: String,
    pub cleanup_required: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginTrigger {
    pub keyword: String,
    pub description: String,
    pub hotkey: Option<String>,
}

// ============================================================================
// Plugin Updates
// ============================================================================

/// Plugin update information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUpdateInfo {
    pub package_name: String,       // npm package name (e.g., "@etools-plugin/devtools")
    pub current_version: String,    // Currently installed version
    pub latest_version: String,     // Latest version from npm
    pub has_update: bool,           // Whether an update is available
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginUpdateMetadata {
    pub latest_version: String,
    pub has_update: bool,
}

// Custom deserialization to support both string and object formats
impl<'de> Deserialize<'de> for PluginTrigger {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{Error, Visitor};
        use std::fmt;

        struct PluginTriggerVisitor;

        impl<'de> Visitor<'de> for PluginTriggerVisitor {
            type Value = PluginTrigger;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a string or an object with keyword field")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(PluginTrigger {
                    keyword: value.to_string(),
                    description: String::new(),
                    hotkey: None,
                })
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: serde::de::MapAccess<'de>,
            {
                let mut keyword = None;
                let mut description = None;
                let mut hotkey = None;

                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "keyword" => {
                            keyword = Some(map.next_value()?);
                        }
                        "description" => {
                            description = Some(map.next_value()?);
                        }
                        "hotkey" => {
                            hotkey = Some(map.next_value()?);
                        }
                        _ => {
                            map.next_value::<serde::de::IgnoredAny>()?;
                        }
                    }
                }

                let keyword = keyword.ok_or_else(|| Error::missing_field("keyword"))?;

                Ok(PluginTrigger {
                    keyword,
                    description: description.unwrap_or_default(),
                    hotkey,
                })
            }
        }

        deserializer.deserialize_any(PluginTriggerVisitor)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub permissions: Vec<String>,
    pub entry: String,
    pub triggers: Vec<PluginTrigger>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPermission {
    pub name: String,
    pub description: String,
    pub granted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPermissionsResponse {
    pub permissions: Vec<String>,
    pub settings: std::collections::HashMap<String, serde_json::Value>,
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

/// Bulk operation type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BulkOperationType {
    Enable,
    Disable,
    Uninstall,
    Update,
}

/// Bulk operation status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BulkOperationStatus {
    Pending,
    InProgress,
    Completed,
    PartialFailure,
    Failed,
}

/// Bulk operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkOperation {
    pub operation_type: BulkOperationType,
    pub target_plugin_ids: Vec<String>,
    pub status: BulkOperationStatus,
    pub results: Vec<BulkOperationResult>,
    pub started_at: i64,           // Unix timestamp (ms)
    pub completed_at: Option<i64>, // Unix timestamp (ms)
}

/// Bulk operation result for a single plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkOperationResult {
    pub plugin_id: String,
    pub success: bool,
    pub error: Option<String>,
}

// ============================================================================
// Marketplace Plugin Types
// ============================================================================

/// Plugin category
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginCategory {
    Productivity,
    Developer,
    Utilities,
    Search,
    Media,
    Integration,
}

/// Marketplace plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplacePlugin {
    // === Basic info (from PluginManifest) ===
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub permissions: Vec<String>,
    pub triggers: Vec<String>,
    pub icon: Option<String>,
    pub homepage: Option<String>,
    pub repository: Option<String>,

    // === Market-specific fields ===
    pub download_count: u64,
    pub rating: f64, // 0-5
    pub rating_count: u32,
    pub category: PluginCategory,

    // === Installation state ===
    pub installed: bool,
    pub installed_version: Option<String>,
    pub update_available: bool,
    pub latest_version: String,

    // === Metadata ===
    pub screenshots: Option<Vec<String>>,
    pub tags: Vec<String>,
    pub published_at: i64, // Unix timestamp (ms)
    pub updated_at: i64,   // Unix timestamp (ms)
}

/// Marketplace plugin page result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplacePluginPage {
    pub plugins: Vec<MarketplacePlugin>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}
