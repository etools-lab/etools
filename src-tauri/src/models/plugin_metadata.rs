/**
 * etools Plugin Metadata Protocol (ETP)
 * 统一的插件元数据协议
 *
 * 所有插件必须在 package.json 中包含 etools 字段
 * 不做向后兼容，缺少必需字段将返回错误
 */

use serde::{Deserialize, Serialize};
use crate::models::plugin::PluginCategory;

/// Plugin setting definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSetting {
    pub key: String,
    pub label: String,
    #[serde(rename = "type")]
    pub setting_type: String,  // "string" | "number" | "boolean" | "select"
    pub default: serde_json::Value,
    pub options: Option<Vec<SettingOption>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingOption {
    pub label: String,
    pub value: serde_json::Value,
}

/// etools 插件元数据协议（ETP）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EtoolsMetadata {
    /// 插件唯一标识符（不含 @etools-plugin/ 前缀）
    pub id: String,

    /// 显示名称（UI 使用，必须友好可读）
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// 详细描述（可选，优先使用此字段而非 package.json#description）
    pub description: Option<String>,

    /// 分类（必填）
    pub category: PluginCategory,

    /// 图标路径（可选，相对于包根目录）
    pub icon: Option<String>,

    /// 项目主页 URL（可选）
    pub homepage: Option<String>,

    /// 截图 URL 列表（可选）
    pub screenshots: Option<Vec<String>>,

    /// 所需权限列表（必填）
    pub permissions: Vec<String>,

    /// 触发关键词列表（必填）
    pub triggers: Vec<String>,

    /// 配置项定义（可选）
    pub settings: Option<Vec<PluginSetting>>,
}

/// etools 元数据解析错误
#[derive(Debug, Clone)]
pub enum MetadataError {
    MissingEtoolsField,
    MissingRequiredField { field: String },
    InvalidCategory { category: String },
    InvalidPackageName { name: String },
    JsonParseError(String),
}

impl std::fmt::Display for MetadataError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MetadataError::MissingEtoolsField => {
                write!(f, "Missing required 'etools' field in package.json")
            }
            MetadataError::MissingRequiredField { field } => {
                write!(f, "Missing required field: etools.{}", field)
            }
            MetadataError::InvalidCategory { category } => {
                write!(f, "Invalid category '{}', must be one of: productivity, developer, utilities, search, media, integration", category)
            }
            MetadataError::InvalidPackageName { name } => {
                write!(f, "Invalid package name '{}', must start with @etools-plugin/", name)
            }
            MetadataError::JsonParseError(msg) => {
                write!(f, "Failed to parse JSON: {}", msg)
            }
        }
    }
}

impl std::error::Error for MetadataError {}

impl EtoolsMetadata {
    /// 从 package.json 解析插件元数据（严格模式，不做向后兼容）
    pub fn from_package_json_str(json_str: &str) -> Result<Self, MetadataError> {
        let package_json: serde_json::Value = serde_json::from_str(json_str)
            .map_err(|e| MetadataError::JsonParseError(e.to_string()))?;

        Self::from_package_json(&package_json)
    }

    /// 从 package.json 对象解析插件元数据（严格模式，不做向后兼容）
    pub fn from_package_json(
        package_json: &serde_json::Value
    ) -> Result<Self, MetadataError> {
        // 1. 检查必须有 etools 字段
        let etools_meta = package_json
            .get("etools")
            .and_then(|v| v.as_object())
            .ok_or(MetadataError::MissingEtoolsField)?;

        // DEBUG: 打印 etools 字段内容
        println!("[ETP Debug] etools_meta keys: {:?}", etools_meta.keys().collect::<Vec<_>>());
        println!("[ETP Debug] etools_meta.has displayName: {}", etools_meta.contains_key("displayName"));

        // 2. 验证包名必须以 @etools-plugin/ 开头
        let package_name = package_json
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or(MetadataError::MissingRequiredField {
                field: "name".to_string()
            })?;

        if !package_name.starts_with("@etools-plugin/") {
            return Err(MetadataError::InvalidPackageName {
                name: package_name.to_string()
            });
        }

        // 3. 解析 id（必填）
        let id = etools_meta
            .get("id")
            .and_then(|v| v.as_str())
            .map(String::from)
            .ok_or(MetadataError::MissingRequiredField {
                field: "id".to_string()
            })?;

        // 4. 解析 displayName（必填）
        let display_name = etools_meta
            .get("displayName")
            .and_then(|v| v.as_str())
            .map(String::from)
            .ok_or(MetadataError::MissingRequiredField {
                field: "displayName".to_string()
            })?;

        println!("[ETP Debug] Found displayName: {}", display_name);

        // 5. 解析 description（可选）
        let description = etools_meta
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from)
            .or_else(|| {
                package_json
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(String::from)
            });

        // 6. 解析 category（必填）
        let category_str = etools_meta
            .get("category")
            .and_then(|v| v.as_str())
            .ok_or(MetadataError::MissingRequiredField {
                field: "category".to_string()
            })?;

        let category = Self::parse_category(category_str)?;

        // 7. 解析可选字段
        let icon = etools_meta
            .get("icon")
            .and_then(|v| v.as_str())
            .map(String::from);

        let homepage = etools_meta
            .get("homepage")
            .and_then(|v| v.as_str())
            .map(String::from);

        let screenshots = etools_meta
            .get("screenshots")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            });

        // 8. 解析 permissions（必填）
        let permissions = etools_meta
            .get("permissions")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            })
            .ok_or(MetadataError::MissingRequiredField {
                field: "permissions".to_string()
            })?;

        // 9. 解析 triggers（必填）
        let triggers = etools_meta
            .get("triggers")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            })
            .ok_or(MetadataError::MissingRequiredField {
                field: "triggers".to_string()
            })?;

        // 10. 解析 settings（可选）
        let settings = etools_meta
            .get("settings")
            .and_then(|v| v.as_array())
            .and_then(|arr| serde_json::from_value(serde_json::Value::Array(arr.clone())).ok());

        Ok(EtoolsMetadata {
            id,
            display_name,
            description,
            category,
            icon,
            homepage,
            screenshots,
            permissions,
            triggers,
            settings,
        })
    }

    /// 解析分类字符串
    fn parse_category(s: &str) -> Result<PluginCategory, MetadataError> {
        match s.to_lowercase().as_str() {
            "productivity" => Ok(PluginCategory::Productivity),
            "developer" => Ok(PluginCategory::Developer),
            "utilities" => Ok(PluginCategory::Utilities),
            "search" => Ok(PluginCategory::Search),
            "media" => Ok(PluginCategory::Media),
            "integration" => Ok(PluginCategory::Integration),
            _ => Err(MetadataError::InvalidCategory {
                category: s.to_string()
            }),
        }
    }

    /// 获取 npm 包名
    pub fn package_name(&self) -> String {
        format!("@etools-plugin/{}", self.id)
    }

    /// 验证元数据完整性
    pub fn validate(&self) -> Result<(), MetadataError> {
        if self.id.is_empty() {
            return Err(MetadataError::MissingRequiredField {
                field: "id".to_string()
            });
        }

        if self.display_name.is_empty() {
            return Err(MetadataError::MissingRequiredField {
                field: "displayName".to_string()
            });
        }

        if self.triggers.is_empty() {
            return Err(MetadataError::MissingRequiredField {
                field: "triggers".to_string()
            });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_metadata() {
        let json = r#"
        {
            "name": "@etools-plugin/example",
            "version": "1.0.0",
            "description": "Base description",
            "etools": {
                "id": "example",
                "displayName": "Example Plugin",
                "description": "Override description",
                "category": "developer",
                "permissions": ["network:request"],
                "triggers": ["example", "ex"]
            }
        }
        "#;

        let metadata = EtoolsMetadata::from_package_json_str(json).unwrap();
        assert_eq!(metadata.id, "example");
        assert_eq!(metadata.display_name, "Example Plugin");
        assert_eq!(metadata.description.as_ref().unwrap(), "Override description");
        assert_eq!(metadata.package_name(), "@etools-plugin/example");
    }

    #[test]
    fn test_missing_etools_field() {
        let json = r#"
        {
            "name": "@etools-plugin/example",
            "version": "1.0.0"
        }
        "#;

        let result = EtoolsMetadata::from_package_json_str(json);
        assert!(matches!(result, Err(MetadataError::MissingEtoolsField)));
    }

    #[test]
    fn test_invalid_package_name() {
        let json = r#"
        {
            "name": "invalid-package",
            "etools": {
                "id": "example",
                "displayName": "Example",
                "category": "developer",
                "permissions": [],
                "triggers": []
            }
        }
        "#;

        let result = EtoolsMetadata::from_package_json_str(json);
        assert!(matches!(result, Err(MetadataError::InvalidPackageName { .. })));
    }

    #[test]
    fn test_missing_required_field() {
        let json = r#"
        {
            "name": "@etools-plugin/example",
            "etools": {
                "id": "example",
                "displayName": "Example",
                "category": "developer",
                "permissions": []
            }
        }
        "#;

        let result = EtoolsMetadata::from_package_json_str(json);
        assert!(matches!(result, Err(MetadataError::MissingRequiredField { .. })));
    }
}
