# Tauri Commands Contract

**Feature**: 001-plugin-manager-ui
**Date**: 2025-01-01
**Purpose**: 定义 Tauri 后端命令接口

---

## Overview

本文档定义了插件管理系统的 Tauri 命令接口，包括：
- 插件生命周期管理命令
- 批量操作命令
- 权限管理命令
- 配置管理命令
- 健康检查命令
- 插件市场命令

所有命令使用 Rust 编写，通过 Tauri 的 `#[tauri::command]` 宏暴露给前端。

---

## 1. 插件生命周期管理命令

### 1.1 plugin_enable

启用指定的插件。

```rust
#[tauri::command]
pub async fn plugin_enable(
    plugin_id: String,
    app: AppHandle,
) -> Result<(), String>
```

**参数**:
- `plugin_id`: 插件唯一标识符

**返回**:
- `Ok(())`: 启用成功
- `Err(String)`: 启用失败，包含错误消息

**错误代码**:
- `PLUGIN_NOT_FOUND`: 插件不存在
- `PLUGIN_ALREADY_ENABLED`: 插件已启用
- `PLUGIN_LOAD_FAILED`: 插件加载失败
- `MISSING_PERMISSIONS`: 缺少必需权限

**前端调用**:
```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('plugin_enable', { pluginId: 'qrcode-generator' });
```

---

### 1.2 plugin_disable

禁用指定的插件。

```rust
#[tauri::command]
pub async fn plugin_disable(
    plugin_id: String,
    app: AppHandle,
) -> Result<(), String>
```

**参数**:
- `plugin_id`: 插件唯一标识符

**返回**:
- `Ok(())`: 禁用成功
- `Err(String)`: 禁用失败，包含错误消息

**错误代码**:
- `PLUGIN_NOT_FOUND`: 插件不存在
- `PLUGIN_ALREADY_DISABLED`: 插件已禁用
- `PLUGIN_IN_USE`: 插件正在使用中

---

### 1.3 plugin_reload

重新加载插件（用于更新或重置）。

```rust
#[tauri::command]
pub async fn plugin_reload(
    plugin_id: String,
    app: AppHandle,
) -> Result<(), String>
```

**参数**:
- `plugin_id`: 插件唯一标识符

**返回**:
- `Ok(())`: 重载成功
- `Err(String)`: 重载失败

---

### 1.4 plugin_uninstall

卸载指定的插件。

```rust
#[tauri::command]
pub async fn plugin_uninstall(
    plugin_id: String,
    delete_config: bool,
    app: AppHandle,
) -> Result<(), String>
```

**参数**:
- `plugin_id`: 插件唯一标识符
- `delete_config`: 是否同时删除配置数据

**返回**:
- `Ok(())`: 卸载成功
- `Err(String)`: 卸载失败

**错误代码**:
- `PLUGIN_NOT_FOUND`: 插件不存在
- `PLUGIN_IN_USE`: 插件正在使用中
- `DELETE_FAILED`: 删除插件文件失败

---

## 2. 批量操作命令

### 2.1 plugin_bulk_enable

批量启用多个插件。

```rust
#[tauri::command]
pub async fn plugin_bulk_enable(
    plugin_ids: Vec<String>,
    app: AppHandle,
) -> Result<BulkOperationResult, String>
```

**参数**:
- `plugin_ids`: 插件 ID 列表

**返回**:
```rust
pub struct BulkOperationResult {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub results: Vec<PluginOperationResult>,
}

pub struct PluginOperationResult {
    pub plugin_id: String,
    pub success: bool,
    pub error: Option<String>,
}
```

---

### 2.2 plugin_bulk_disable

批量禁用多个插件。

```rust
#[tauri::command]
pub async fn plugin_bulk_disable(
    plugin_ids: Vec<String>,
    app: AppHandle,
) -> Result<BulkOperationResult, String>
```

**参数**和返回值同上。

---

### 2.3 plugin_bulk_uninstall

批量卸载多个插件。

```rust
#[tauri::command]
pub async fn plugin_bulk_uninstall(
    plugin_ids: Vec<String>,
    delete_config: bool,
    app: AppHandle,
) -> Result<BulkOperationResult, String>
```

**参数**:
- `plugin_ids`: 插件 ID 列表
- `delete_config`: 是否同时删除配置数据

**返回**: `BulkOperationResult`

---

## 3. 权限管理命令

### 3.1 plugin_get_permissions

获取插件的权限授予状态。

```rust
#[tauri::command]
pub async fn plugin_get_permissions(
    plugin_id: String,
    app: AppHandle,
) -> Result<PermissionState, String>
```

**返回**:
```rust
pub struct PermissionState {
    pub plugin_id: String,
    pub permissions: Vec<PermissionEntry>,
}

pub struct PermissionEntry {
    pub permission: PluginPermission,
    pub granted: bool,
    pub required: bool,  // 是否为必需权限
}
```

---

### 3.2 plugin_grant_permission

授予插件权限。

```rust
#[tauri::command]
pub async fn plugin_grant_permission(
    plugin_id: String,
    permission: PluginPermission,
    app: AppHandle,
) -> Result<(), String>
```

**参数**:
- `plugin_id`: 插件 ID
- `permission`: 要授予的权限类型

**权限类型**:
```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum PluginPermission {
    ReadClipboard,
    WriteClipboard,
    ReadFiles,
    WriteFiles,
    Network,
    Shell,
    Notifications,
    Settings,
}
```

---

### 3.3 plugin_revoke_permission

撤销插件权限。

```rust
#[tauri::command]
pub async fn plugin_revoke_permission(
    plugin_id: String,
    permission: PluginPermission,
    app: AppHandle,
) -> Result<(), String>
```

---

## 4. 配置管理命令

### 4.1 plugin_get_config

获取插件配置。

```rust
#[tauri::command]
pub async fn plugin_get_config(
    plugin_id: String,
    app: AppHandle,
) -> Result<std::collections::HashMap<String, ConfigValue>, String>
```

**返回**:
```rust
#[derive(Serialize, Deserialize)]
pub enum ConfigValue {
    String(String),
    Number(i64),
    Boolean(bool),
}
```

---

### 4.2 plugin_set_config

更新插件配置。

```rust
#[tauri::command]
pub async fn plugin_set_config(
    plugin_id: String,
    config: std::collections::HashMap<String, ConfigValue>,
    app: AppHandle,
) -> Result<(), String>
```

---

### 4.3 plugin_reset_config

重置插件配置为默认值。

```rust
#[tauri::command]
pub async fn plugin_reset_config(
    plugin_id: String,
    app: AppHandle,
) -> Result<(), String>
```

---

## 5. 健康检查命令

### 5.1 plugin_get_health

获取插件健康状态。

```rust
#[tauri::command]
pub async fn plugin_get_health(
    plugin_id: String,
    app: AppHandle,
) -> Result<PluginHealth, String>
```

**返回**:
```rust
pub struct PluginHealth {
    pub plugin_id: String,
    pub status: HealthStatus,
    pub message: Option<String>,
    pub last_checked: i64,  // Unix timestamp (ms)
    pub errors: Vec<PluginError>,
}

#[derive(Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Warning,
    Error,
    Unknown,
}

pub struct PluginError {
    pub code: String,
    pub message: String,
    pub timestamp: i64,
    pub context: Option<std::collections::HashMap<String, String>>,
}
```

---

### 5.2 plugin_check_health

重新检查插件健康状态。

```rust
#[tauri::command]
pub async fn plugin_check_health(
    plugin_id: String,
    app: AppHandle,
) -> Result<PluginHealth, String>
```

---

### 5.3 plugin_get_usage_stats

获取插件使用统计。

```rust
#[tauri::command]
pub async fn plugin_get_usage_stats(
    plugin_id: String,
    app: AppHandle,
) -> Result<PluginUsageStats, String>
```

**返回**:
```rust
pub struct PluginUsageStats {
    pub plugin_id: String,
    pub last_used: Option<i64>,
    pub usage_count: u64,
    pub last_execution_time: Option<u64>,
    pub average_execution_time: Option<u64>,
}
```

---

## 6. 插件列表命令

### 6.1 plugin_list

获取所有已安装插件列表。

```rust
#[tauri::command]
pub fn plugin_list(
    app: AppHandle,
) -> Result<Vec<PluginManifest>, String>
```

**返回**: 插件清单列表

```rust
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub permissions: Vec<PluginPermission>,
    pub triggers: Vec<String>,
    pub settings: Option<Vec<PluginSetting>>,
    pub icon: Option<String>,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub enabled: bool,
    pub installed_at: i64,
}
```

---

### 6.2 plugin_get

获取单个插件的完整信息。

```rust
#[tauri::command]
pub fn plugin_get(
    plugin_id: String,
    app: AppHandle,
) -> Result<Plugin, String>
```

**返回**: 完整的插件对象（包括健康状态和统计信息）

---

## 7. 插件市场命令

### 7.1 marketplace_list

获取插件市场列表。

```rust
#[tauri::command]
pub async fn marketplace_list(
    category: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
    app: AppHandle,
) -> Result<MarketplacePage, String>
```

**返回**:
```rust
pub struct MarketplacePage {
    pub plugins: Vec<MarketplacePlugin>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub has_more: bool,
}

pub struct MarketplacePlugin {
    // 继承 PluginManifest 的所有字段
    #[serde(flatten)]
    pub manifest: PluginManifest,

    // 市场特定字段
    pub download_count: u64,
    pub rating: f64,
    pub rating_count: u32,
    pub category: String,
    pub installed: bool,
    pub installed_version: Option<String>,
    pub update_available: bool,
    pub latest_version: String,
    pub screenshots: Option<Vec<String>>,
    pub tags: Vec<String>,
    pub published_at: i64,
    pub updated_at: i64,
}
```

---

### 7.2 marketplace_search

搜索插件市场。

```rust
#[tauri::command]
pub async fn marketplace_search(
    query: String,
    category: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
    app: AppHandle,
) -> Result<MarketplacePage, String>
```

---

### 7.3 marketplace_install

从市场安装插件。

```rust
#[tauri::command]
pub async fn marketplace_install(
    plugin_id: String,
    app: AppHandle,
) -> Result<InstallResult, String>
```

**返回**:
```rust
pub struct InstallResult {
    pub success: bool,
    pub plugin: Option<Plugin>,
    pub error: Option<String>,
}
```

---

### 7.4 marketplace_check_updates

检查插件更新。

```rust
#[tauri::command]
pub async fn marketplace_check_updates(
    app: AppHandle,
) -> Result<Vec<String>, String>
```

**返回**: 有可用更新的插件 ID 列表

---

## 8. 事件 (Events)

Tauri 事件用于后端主动向前端推送状态变化。

### 8.1 插件状态变更事件

```rust
// 插件已启用
app.emit("plugin:enabled", PluginEventData { plugin_id })?;

// 插件已禁用
app.emit("plugin:disabled", PluginEventData { plugin_id })?;

// 插件已卸载
app.emit("plugin:uninstalled", PluginEventData { plugin_id })?;
```

### 8.2 插件健康状态变更事件

```rust
app.emit("plugin:health_changed", PluginHealthEventData {
    plugin_id,
    health,
})?;
```

### 8.3 批量操作进度事件

```rust
app.emit("bulk:progress", BulkProgressEventData {
    operation_id,
    completed,
    total,
    current_result,
})?;
```

---

## Error Handling

### 错误响应格式

所有命令在失败时返回 `Err(String)`，字符串格式为：

```
ERROR_CODE: Error message
```

**示例**:
```rust
Err("PLUGIN_NOT_FOUND: Plugin 'xyz' does not exist".to_string())
```

### 前端错误处理

```typescript
try {
  await invoke('plugin_enable', { pluginId: 'test' });
} catch (error) {
  const errorCode = error.split(':')[0];
  const errorMessage = error.split(':')[1]?.trim() || error;

  switch (errorCode) {
    case 'PLUGIN_NOT_FOUND':
      showNotification('error', '插件不存在', errorMessage);
      break;
    case 'PLUGIN_ALREADY_ENABLED':
      showNotification('warning', '插件已启用', errorMessage);
      break;
    default:
      showNotification('error', '操作失败', errorMessage);
  }
}
```

---

## Database Schema

### plugins 表

```sql
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    author TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    installed_at INTEGER NOT NULL,
    manifest_json TEXT NOT NULL,
    config_json TEXT,
    usage_stats_json TEXT,
    health_json TEXT
);
```

### plugin_permissions 表

```sql
CREATE TABLE plugin_permissions (
    plugin_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT 0,
    PRIMARY KEY (plugin_id, permission),
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

### plugin_usage_log 表

```sql
CREATE TABLE plugin_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    execution_time_ms INTEGER,
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

### marketplace_cache 表

```sql
CREATE TABLE marketplace_cache (
    plugin_id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
```

---

## Implementation Checklist

### Phase 1: Core Commands
- [ ] `plugin_enable`
- [ ] `plugin_disable`
- [ ] `plugin_list`
- [ ] `plugin_get`
- [ ] `plugin_uninstall`

### Phase 2: Permission Management
- [ ] `plugin_get_permissions`
- [ ] `plugin_grant_permission`
- [ ] `plugin_revoke_permission`

### Phase 3: Configuration
- [ ] `plugin_get_config`
- [ ] `plugin_set_config`
- [ ] `plugin_reset_config`

### Phase 4: Health & Stats
- [ ] `plugin_get_health`
- [ ] `plugin_check_health`
- [ ] `plugin_get_usage_stats`

### Phase 5: Bulk Operations
- [ ] `plugin_bulk_enable`
- [ ] `plugin_bulk_disable`
- [ ] `plugin_bulk_uninstall`

### Phase 6: Marketplace
- [ ] `marketplace_list`
- [ ] `marketplace_search`
- [ ] `marketplace_install`
- [ ] `marketplace_check_updates`

---

## Next Steps

- [ ] 实现核心命令的 Rust 代码
- [ ] 添加错误处理和日志记录
- [ ] 实现数据库层
- [ ] 添加事件发射逻辑
- [ ] 编写单元测试
- [ ] 更新 `src-tauri/tauri.conf.json` 注册命令
