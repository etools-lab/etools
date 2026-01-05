# API Contract: Plugin System

**Subsystem**: Plugin Management
**Version**: 1.0.0
**Status**: Draft

---

## Overview

This contract defines the Tauri commands for managing plugins and the plugin SDK API.

---

## Commands

### `list_plugins`

Returns all installed and available plugins.

**Request**:
```typescript
interface ListPluginsRequest {
  includeBuiltin?: boolean;  // Include built-in plugins (default: true)
  source?: 'installed' | 'available' | 'all';  // Filter by source
}
```

**Response**:
```typescript
interface PluginInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  installed: boolean;
  enabled: boolean;
  builtin: boolean;
  permissions: Permission[];
  triggers?: string[];
  rating?: number;
  installDate?: number;
}

interface ListPluginsResponse {
  plugins: PluginInfo[];
  total: number;
}
```

---

### `install_plugin`

Installs a plugin from a local file or remote URL.

**Request**:
```typescript
interface InstallPluginRequest {
  source: string;  // Local file path or remote URL
  manifestUrl?: string;  // Optional manifest URL for validation
}
```

**Response**:
```typescript
interface InstallPluginResponse {
  plugin: PluginInfo;
  permissions: Permission[];  // Permissions requested by plugin
}
```

**Errors**:
- `INVALID_MANIFEST`: Plugin manifest is invalid
- `PERMISSION_DENIED`: User denied required permissions
- `ALREADY_INSTALLED`: Plugin is already installed
- `DOWNLOAD_FAILED`: Failed to download plugin

---

### `uninstall_plugin`

Removes an installed plugin.

**Request**:
```typescript
interface UninstallPluginRequest {
  id: string;  // Plugin ID
}
```

**Response**:
```typescript
interface UninstallPluginResponse {
  success: boolean;
}
```

---

### `enable_plugin` / `disable_plugin`

Enables or disables a plugin.

**Request**:
```typescript
interface SetPluginEnabledRequest {
  id: string;
  enabled: boolean;
}
```

**Response**:
```typescript
interface SetPluginEnabledResponse {
  plugin: PluginInfo;
}
```

---

### `get_plugin_manifest`

Retrieves the manifest for a plugin.

**Request**:
```typescript
interface GetPluginManifestRequest {
  id: string;
}
```

**Response**:
```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: Permission[];
  triggers?: string[];
  entry: string;
  icon?: string;
  homepage?: string;
  repository?: string;
  minAppVersion?: string;
}

interface GetPluginManifestResponse {
  manifest: PluginManifest;
}
```

---

### `reload_plugin`

Reloads a plugin (for development).

**Request**:
```typescript
interface ReloadPluginRequest {
  id: string;
}
```

**Response**:
```typescript
interface ReloadPluginResponse {
  success: boolean;
  error?: string;
}
```

---

### `grant_plugin_permission`

Grants a permission to a plugin.

**Request**:
```typescript
interface GrantPluginPermissionRequest {
  pluginId: string;
  permission: Permission;
}
```

**Response**:
```typescript
interface GrantPluginPermissionResponse {
  permissions: Permission[];  // Updated permissions list
}
```

---

### `revoke_plugin_permission`

Revokes a permission from a plugin.

**Request**:
```typescript
interface RevokePluginPermissionRequest {
  pluginId: string;
  permission: Permission;
}
```

**Response**:
```typescript
interface RevokePluginPermissionResponse {
  permissions: Permission[];
}
```

---

## Plugin SDK API

Plugins interact with the host application via the Plugin SDK.

### SDK Interface

```typescript
interface PluginSDK {
  // Lifecycle hooks
  onInstall?(ctx: PluginContext): Promise<void>;
  onUninstall?(ctx: PluginContext): Promise<void>;
  onEnable?(ctx: PluginContext): Promise<void>;
  onDisable?(ctx: PluginContext): Promise<void>;

  // Search hook
  onSearch?(query: string, ctx: PluginContext): Promise<PluginResult[]>;

  // Action hooks
  onActivate?(result: PluginResult, ctx: PluginContext): Promise<void>;

  // UI rendering (optional)
  renderUI?(props: any, ctx: PluginContext): React.ComponentType;
}

interface PluginResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  score?: number;
  action?: () => void | Promise<void>;
  data?: any;
}

interface PluginContext {
  // Permissions
  permissions: Permission[];

  // Storage
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };

  // Clipboard (requires permission)
  clipboard?: {
    read(): Promise<string>;
    write(text: string): Promise<void>;
  };

  // File system (requires permission)
  fs?: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    list(path: string): Promise<string[]>;
  };

  // Shell (requires permission)
  shell?: {
    execute(command: string): Promise<string>;
    open(path: string): Promise<void>;
  };

  // Network (requires permission)
  network?: {
    fetch(url: string, options?: RequestInit): Promise<Response>;
  };

  // Logging
  log: {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  };
}
```

---

## Plugin Manifest Format

```json
{
  "id": "author.plugin-name",
  "name": "Plugin Name",
  "version": "1.0.0",
  "author": "Author Name",
  "description": "Short description",
  "permissions": [
    "clipboard:read",
    "fs:read",
    "network:request"
  ],
  "triggers": ["plugin", "trigger"],
  "entry": "index.ts",
  "icon": "icon.png",
  "homepage": "https://example.com",
  "repository": "https://github.com/author/plugin",
  "minAppVersion": "1.0.0"
}
```

---

## Plugin Sandbox

### Isolation Strategy

- **Runtime**: Web Worker or isolated iframe
- **API Surface**: Only SDK-exposed functions available
- **Communication**: PostMessage-based IPC
- **Memory**: Limited memory quota (default: 50MB per plugin)

### Permission Checks

```typescript
// Permission check before API access
function checkPermission(
  plugin: PluginInfo,
  permission: Permission
): boolean {
  return plugin.permissions.includes(permission);
}

// Usage in SDK
async function clipboardRead(
  ctx: PluginContext
): Promise<string> {
  if (!checkPermission(ctx.plugin, 'clipboard:read')) {
    throw new Error('Permission denied: clipboard:read');
  }
  return invoke('get_clipboard_content');
}
```

---

## Events

### `plugin:installed`

Emitted when a plugin is installed.

**Event Data**:
```typescript
interface PluginInstalledEvent {
  plugin: PluginInfo;
}
```

---

### `plugin:uninstalled`

Emitted when a plugin is uninstalled.

**Event Data**:
```typescript
interface PluginUninstalledEvent {
  pluginId: string;
}
```

---

### `plugin:error`

Emitted when a plugin throws an error.

**Event Data**:
```typescript
interface PluginErrorEvent {
  pluginId: string;
  error: string;
  stack?: string;
}
```

---

## Plugin Error Handling

### Error Isolation

```typescript
// Wrap plugin execution in error boundary
async function executePluginHook<T>(
  plugin: PluginInfo,
  hook: string,
  ...args: any[]
): Promise<T> {
  try {
    return await plugin.module[hook](...args);
  } catch (error) {
    // Disable plugin on error
    await disablePlugin(plugin.id);

    // Emit error event
    emit('plugin:error', {
      pluginId: plugin.id,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}
```

---

## Performance Requirements

| Operation | Target Latency | Notes |
|-----------|----------------|-------|
| list_plugins | <100ms | For 100 plugins |
| install_plugin | <2s | Excluding download time |
| onSearch (plugin) | <100ms | Per plugin |
| Plugin load | <200ms | Per plugin |

---

## Security Considerations

1. **Manifest Validation**: Validate all manifest fields before installation
2. **Permission Prompt**: User must grant sensitive permissions
3. **Sandbox Escape Detection**: Monitor for attempts to access restricted APIs
4. **Code Signature**: Verify plugin integrity (future enhancement)
5. **Rate Limiting**: Limit plugin API call frequency to prevent abuse

---

## Example Plugin

```typescript
// index.ts
import { PluginSDK, PluginResult, PluginContext } from '@kaka/plugin-sdk';

const sdk: PluginSDK = {
  async onSearch(query: string, ctx: PluginContext): Promise<PluginResult[]> {
    if (!query.startsWith('calc ')) return [];

    const expression = query.slice(5);
    const result = eval(expression); // Simplified for example

    return [{
      id: 'calc-result',
      title: `${expression} = ${result}`,
      subtitle: 'Calculator',
      icon: '🧮',
      score: 1.0,
      action: async () => {
        await ctx.clipboard?.write(String(result));
      }
    }];
  }
};

export default sdk;
```
