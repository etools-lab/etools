# Plugin API Contract

**Feature**: 002-mvp-completion | **Module**: Plugin System
**Purpose**: Tauri commands for plugin loading, validation, execution, and settings

---

## Overview

The plugin API provides commands for managing plugins, including installation, validation, execution, and permission handling.

---

## Commands

### 1. `list_plugins`

List all installed plugins.

**Location**: `src-tauri/src/cmds/plugins.rs`

**Signature**:
```rust
#[tauri::command]
pub fn list_plugins(
) -> Result<Vec<Plugin>, String>
```

**Returns**: `Result<Vec<Plugin>, String>`

**Plugin Structure**:
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  permissions: PluginPermission[];
  entry_point: string;
  triggers: string[];
  settings: Record<string, unknown>;
}
```

**PluginPermission Enum**:
```typescript
type PluginPermission =
  | 'read_clipboard'
  | 'write_clipboard'
  | 'read_file'
  | 'write_file'
  | 'network'
  | 'shell'
  | 'notification';
```

**Error Conditions**:
- Plugins directory not accessible → Permission error

**Examples**:
```typescript
const plugins = await invoke<Plugin[]>('list_plugins');
console.log(`Found ${plugins.length} plugins`);
```

---

### 2. `validate_plugin_manifest`

Validate a plugin manifest before installation.

**Signature**:
```rust
#[tauri::command]
pub fn validate_plugin_manifest(
    plugin_id: String,
) -> Result<PluginValidationResult, String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `plugin_id` | String | Yes | Plugin directory name |

**Returns**: `Result<PluginValidationResult, String>`

**PluginValidationResult Structure**:
```typescript
interface PluginValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Validation Checks**:
1. `plugin.json` exists in plugin directory
2. Required fields present (id, name, version, triggers, entry)
3. ID format valid (alphanumeric + hyphens/underscores)
4. Triggers end with colon (`:`)
5. Entry point file exists
6. Permissions are from allowed set
7. Version format is semantic (MAJOR.MINOR.PATCH)

**Examples**:
```typescript
const result = await invoke<PluginValidationResult>('validate_plugin_manifest', {
  plugin_id: 'qrcode-generator'
});

if (!result.is_valid) {
  console.error('Validation errors:', result.errors);
} else if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

---

### 3. `install_plugin`

Install a plugin from a local path or URL.

**Signature**:
```rust
#[tauri::command]
pub async fn install_plugin(
    plugin_path: String,
    manifest: PluginManifest,
) -> Result<Plugin, String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `plugin_path` | String | Yes | Local file path or URL to plugin package |
| `manifest` | PluginManifest | Yes | Plugin manifest object |

**Returns**: `Result<Plugin, String>` - Installed plugin metadata

**Error Conditions**:
- Invalid manifest format → Validation error
- Permission denied → File system error
- Plugin already exists → Conflict error

**Examples**:
```typescript
const plugin = await invoke<Plugin>('install_plugin', {
  plugin_path: '/path/to/qrcode-plugin.tar.gz',
  manifest: {
    id: 'qrcode-generator',
    name: 'QR Code Generator',
    version: '1.0.0',
    // ... other fields
  }
});
```

---

### 4. `uninstall_plugin`

Remove an installed plugin.

**Signature**:
```rust
#[tauri::command]
pub fn uninstall_plugin(
    plugin_id: String,
) -> Result<(), String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `plugin_id` | String | Yes | Plugin to uninstall |

**Returns**: `Result<(), String>`

**Error Conditions**:
- Plugin not found → Silent success (idempotent)

**Examples**:
```typescript
await invoke('uninstall_plugin', { plugin_id: 'qrcode-generator' });
```

---

### 5. `enable_plugin` / `disable_plugin`

Enable or disable a plugin.

**Signature**:
```rust
#[tauri::command]
pub fn enable_plugin(
    plugin_id: String,
) -> Result<(), String>

#[tauri::command]
pub fn disable_plugin(
    plugin_id: String,
) -> Result<(), String>
```

**Parameters**: `plugin_id` (string)

**Returns**: `Result<(), String>`

---

### 6. `get_plugin_manifest`

Get the manifest for a specific plugin.

**Signature**:
```rust
#[tauri::command]
pub fn get_plugin_manifest(
    plugin_id: String,
) -> Result<PluginManifest, String>
```

**Returns**: `Result<PluginManifest, String>`

**PluginManifest Structure**:
```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  triggers: string[];
  permissions: PluginPermission[];
  entry: string;
  settings?: Record<string, unknown>;
}
```

---

### 7. `get_plugin_permissions`

Get permissions and settings for a plugin.

**Signature**:
```rust
#[tauri::command]
pub fn get_plugin_permissions(
    plugin_id: String,
) -> Result<PluginPermissionsResponse, String>
```

**Returns**: `Result<PluginPermissionsResponse, String>`

**PluginPermissionsResponse Structure**:
```typescript
interface PluginPermissionsResponse {
  permissions: PluginPermission[];
  settings: Record<string, unknown>;
}
```

---

### 8. `set_plugin_setting`

Update a plugin setting.

**Signature**:
```rust
#[tauri::command]
pub fn set_plugin_setting(
    plugin_id: String,
    key: String,
    value: serde_json::Value,
) -> Result<(), String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `plugin_id` | String | Yes | Plugin ID |
| `key` | String | Yes | Setting name |
| `value` | JsonValue | Yes | Setting value (must match schema) |

**Returns**: `Result<(), String>`

**Validation**: Value must match schema in plugin's `settings_schema`

---

### 9. `get_plugin_setting`

Get a specific plugin setting value.

**Signature**:
```rust
#[tauri::command]
pub fn get_plugin_setting(
    plugin_id: String,
    key: String,
) -> Result<serde_json::Value, String>
```

**Returns**: `Result<JsonValue, String>` - Setting value or `null` if not set

---

## Plugin Execution (Frontend)

Plugins are executed in the frontend context with restricted API access. The backend provides permission-checked command execution.

### Frontend Plugin Loader

```typescript
// Located in: src/services/pluginLoader.ts

interface PluginAPI {
  invoke: (cmd: string, args?: unknown) => Promise<unknown>;
  log: (...args: unknown[]) => void;
}

async function loadPlugin(manifest: PluginManifest): Promise<Plugin> {
  // 1. Load plugin code
  const code = await loadPluginCode(manifest.entry);

  // 2. Create restricted API
  const restrictedApi: PluginAPI = {
    invoke: async (cmd: string, args?: unknown) => {
      // Check permission before invoking Tauri command
      if (!hasPermission(manifest.permissions, cmd)) {
        throw new Error(`Permission denied: ${cmd}`);
      }
      return invoke(cmd, args);
    },
    log: console.log,
  };

  // 3. Execute plugin code
  const pluginFn = new Function('api', code);
  return pluginFn(restrictedApi);
}

function hasPermission(permissions: PluginPermission[], cmd: string): boolean {
  const permissionMap: Record<string, PluginPermission> = {
    'get_clipboard_history': 'read_clipboard',
    'paste_clipboard_item': 'write_clipboard',
    'read_file': 'read_file',
    'write_file': 'write_file',
    'http_request': 'network',
    'execute_shell': 'shell',
    'send_notification': 'notification',
  };

  const required = permissionMap[cmd];
  return required ? permissions.includes(required) : true;
}
```

### Plugin Entry Point Template

```typescript
// Plugin entry point: plugins/qrcode-generator/index.ts

export async function init(api: PluginAPI) {
  return {
    id: 'qrcode-generator',
    name: 'QR Code Generator',
    triggers: ['qr:', 'qrcode:'],

    // Called when user types trigger keyword
    async execute(query: string) {
      const text = query.replace(/^qr:/, '');

      // Generate QR code (using qrcode library)
      const qrData = await generateQRCode(text);

      return {
        title: `QR Code: ${text}`,
        subtitle: 'Click to copy image',
        icon: '📱',
        action: async () => {
          await api.invoke('paste_clipboard_item', {
            id: qrData.clipboardId
          });
        },
      };
    },
  };
}
```

---

## Events

### `plugin:installed`

Emitted when a plugin is installed.

**Payload**: `Plugin`

### `plugin:uninstalled`

Emitted when a plugin is uninstalled.

**Payload**: `{ plugin_id: string }`

### `plugin:enabled` / `plugin:disabled`

Emitted when a plugin is enabled or disabled.

**Payload**: `{ plugin_id: string }`

---

## Implementation Notes

### Plugin Directory Structure

```
~/.config/kaka/plugins/
├── qrcode-generator/
│   ├── plugin.json          # Manifest
│   ├── index.ts             # Entry point
│   ├── package.json         # NPM dependencies (if any)
│   └── assets/              # Plugin assets
└── weather-search/
    ├── plugin.json
    └── index.ts
```

### Security Model

1. **Permission Checks**: All Tauri commands invoked by plugins are checked against plugin's permissions
2. **Sandbox Limits**: Plugins run in frontend context with restricted `invoke()` access
3. **Validation**: All manifests validated before installation
4. **User Approval**: Plugins with sensitive permissions show permission dialog

### Plugin Loading Flow

```
1. User installs plugin → manifest validated
2. Plugin code loaded from file system
3. Entry point executed with restricted API
4. Plugin registers triggers and handlers
5. User types trigger → plugin handler executed
6. Results displayed in search UI
```

### Performance Requirements

- `list_plugins`: <100ms
- Plugin loading: <500ms per plugin
- Plugin execution: <1s (with timeout)

### Error Handling

- Plugin crashes → Show error, don't crash main app
- Invalid plugin code → Show validation error
- Permission denied → Show user-friendly message
