# Data Model: Plugin Management System

**Date**: 2025-01-03  
**Purpose**: Data entities and relationships for plugin management functionality

## Core Entities

### Plugin

Represents an installed plugin with complete metadata and runtime information.

```typescript
interface Plugin {
  // Basic Information
  id: string;                    // Unique plugin identifier
  name: string;                  // Display name
  version: string;               // Semantic version
  description: string;           // Plugin description
  author: string;                // Plugin author
  
  // Runtime State
  enabled: boolean;              // Whether plugin is currently enabled
  installedAt: number;           // Installation timestamp (Unix ms)
  
  // Plugin Manifest
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    permissions: PluginPermission[];
    entry: string;               // Entry file path
    triggers: PluginTrigger[];
    homepage?: string;
    repository?: string;
  };
  
  // Runtime Information
  health: PluginHealth;
  usageStats: PluginUsageStats;
  
  // Installation Details
  installPath: string;           // File system path
  source: 'marketplace' | 'local' | 'github-release';
}
```

### PluginHealth

Plugin health monitoring and status information.

```typescript
interface PluginHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message?: string;              // Current status message
  lastChecked: number;           // Last health check timestamp
  errors: PluginErrorEntry[];     // Recent error history
}

interface PluginErrorEntry {
  code: string;                 // Error code
  message: string;               // Error description
  timestamp: number;             // Error timestamp
  context?: Record<string, string>; // Additional context
}
```

### PluginUsageStats

Plugin usage statistics and performance metrics.

```typescript
interface PluginUsageStats {
  lastUsed?: number;             // Last usage timestamp
  usageCount: number;            // Total usage count
  lastExecutionTime?: number;     // Last execution duration (ms)
  averageExecutionTime?: number;  // Average execution duration (ms)
}
```

### PluginTrigger

Plugin trigger configuration for search functionality.

```typescript
interface PluginTrigger {
  keyword: string;               // Search trigger keyword
  description: string;           // Trigger description
  hotkey?: string;              // Optional hotkey
}
```

### PluginPermission

Plugin permission definitions and status.

```typescript
type PluginPermission = 
  | 'clipboard:read'
  | 'clipboard:write'
  | 'fs:read'
  | 'fs:write'
  | 'network'
  | 'shell'
  | 'notification'
  | 'plugin:manage';

interface PermissionStatus {
  permission: PluginPermission;
  granted: boolean;
  required: boolean;             // Whether permission is required
  description: string;           // Permission description
}
```

## Installation Entities

### PluginPackage

Represents a plugin package during installation.

```typescript
interface PluginPackage {
  // Package Information
  id: string;                   // Extracted from manifest
  version: string;
  source: 'file' | 'url' | 'github-release';
  filePath?: string;             // Local file path (if file source)
  url?: string;                 // Download URL (if url source)
  
  // Package Validation
  isValid: boolean;              // Whether package is valid
  validationErrors: string[];     // Validation error messages
  
  // Installation State
  extractedPath?: string;         // Temporary extraction path
  installProgress: number;       // Installation progress (0-100)
  installStep: InstallStep;
}

type InstallStep = 
  | 'validating'
  | 'extracting'
  | 'installing'
  | 'verifying'
  | 'complete'
  | 'failed';
```

### PluginManifest

Plugin manifest structure extracted from plugin.json.

```typescript
interface PluginManifest {
  // Required Fields
  id: string;                   // Unique identifier (lowercase, alphanumeric, hyphens)
  name: string;                 // Display name
  version: string;               // Semantic version (x.y.z)
  description: string;           // Plugin description
  author: string;                // Plugin author
  entry: string;                // Entry file path
  permissions: PluginPermission[];
  triggers: PluginTrigger[];
  
  // Optional Fields
  homepage?: string;             // Plugin homepage URL
  repository?: string;           // Source repository URL
  license?: string;             // License identifier
  keywords?: string[];          // Search keywords
  category?: PluginCategory;     // Plugin category
}
```

## Management Entities

### BulkOperation

Represents a bulk operation on multiple plugins.

```typescript
interface BulkOperation {
  // Operation Information
  id: string;                   // Operation ID
  type: 'enable' | 'disable' | 'uninstall' | 'update';
  targetPluginIds: string[];      // Target plugin IDs
  
  // Operation State
  status: 'pending' | 'in-progress' | 'completed' | 'partial-failure' | 'failed';
  startedAt: number;             // Start timestamp
  completedAt?: number;          // Completion timestamp
  
  // Results
  results: BulkOperationResult[];
  summary: {
    total: number;               // Total plugins
    successful: number;           // Successful operations
    failed: number;              // Failed operations
  };
}

interface BulkOperationResult {
  pluginId: string;             // Plugin ID
  success: boolean;             // Operation success
  error?: string;               // Error message (if failed)
  duration?: number;            // Operation duration (ms)
}
```

### PluginFilter

Plugin filtering and search criteria.

```typescript
interface PluginFilter {
  // Status Filter
  status?: 'all' | 'enabled' | 'disabled';
  
  // Category Filter
  category?: PluginCategory;
  
  // Search Filter
  query?: string;                // Search query
  
  // Permission Filter
  hasPermissions?: PluginPermission[];
  
  // Sort Options
  sortBy?: 'name' | 'installedAt' | 'lastUsed' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

type PluginCategory = 
  | 'productivity'
  | 'developer'
  | 'utilities'
  | 'search'
  | 'media'
  | 'integration';
```

## Configuration Entities

### PluginConfig

Plugin-specific configuration settings.

```typescript
interface PluginConfig {
  pluginId: string;             // Plugin ID
  enabled: boolean;             // Plugin enabled state
  
  // Permissions
  grantedPermissions: PluginPermission[];
  permissionOverrides: Record<string, boolean>;
  
  // Plugin Settings
  settings: Record<string, PluginSettingValue>;
  
  // Update Settings
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
}

type PluginSettingValue = 
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>;
```

### PluginSetting

Plugin setting definition from manifest.

```typescript
interface PluginSetting {
  key: string;                  // Setting key
  name: string;                 // Display name
  description: string;           // Setting description
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  
  // Value Constraints
  required: boolean;             // Whether setting is required
  default?: PluginSettingValue;  // Default value
  options?: PluginSettingOption[]; // Options for select/multiselect
  
  // Validation
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;           // Regex pattern for strings
  };
}

interface PluginSettingOption {
  value: string | number | boolean;
  label: string;                // Display label
  description?: string;          // Option description
}
```

## Event Entities

### PluginEvent

Plugin-related events for system monitoring and debugging.

```typescript
interface PluginEvent {
  id: string;                   // Event ID
  pluginId: string;             // Plugin ID
  type: PluginEventType;
  timestamp: number;             // Event timestamp
  data?: Record<string, unknown>; // Event-specific data
  error?: string;               // Error information (if applicable)
}

type PluginEventType = 
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'uninstalled'
  | 'crashed'
  | 'error'
  | 'health-checked'
  | 'updated';
```

## Database Schema

### SQLite Tables

#### plugins Table
```sql
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    author TEXT,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    installed_at INTEGER NOT NULL,
    install_path TEXT NOT NULL,
    source TEXT NOT NULL,
    manifest TEXT NOT NULL,        -- JSON string
    health_status TEXT NOT NULL DEFAULT 'unknown',
    health_message TEXT,
    health_last_checked INTEGER,
    usage_last_used INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_last_execution_time INTEGER,
    usage_average_execution_time INTEGER
);
```

#### plugin_errors Table
```sql
CREATE TABLE plugin_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    context TEXT,               -- JSON string
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

#### plugin_config Table
```sql
CREATE TABLE plugin_config (
    plugin_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    granted_permissions TEXT,      -- JSON array
    settings TEXT,               -- JSON object
    auto_update BOOLEAN DEFAULT 0,
    update_channel TEXT DEFAULT 'stable',
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

#### plugin_events Table
```sql
CREATE TABLE plugin_events (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    data TEXT,                   -- JSON object
    error TEXT,
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);
```

#### bulk_operations Table
```sql
CREATE TABLE bulk_operations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    target_plugin_ids TEXT NOT NULL, -- JSON array
    status TEXT NOT NULL DEFAULT 'pending',
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    results TEXT                 -- JSON array
);
```

## Relationships

```
Plugin (1) -----> (N) PluginError
Plugin (1) -----> (1) PluginConfig
Plugin (1) -----> (N) PluginEvent
Plugin (N) -----> (1) BulkOperation

PluginManifest ---< implements ---< Plugin
PluginPermission ---< used by ---< Plugin
PluginTrigger ---< defined in ---< Plugin
```

## Validation Rules

### Plugin ID Validation
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length: 3-50 characters
- Examples: `hello-world`, `qr-generator`, `json-formatter`

### Version Validation
- Semantic versioning: `^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$`
- Examples: `1.0.0`, `2.1.3-beta`, `1.0.0-alpha.1`

### Permission Validation
- Must be from predefined permission list
- Each plugin must request minimum required permissions
- User must explicitly grant permissions

### File Path Validation
- Plugin install path must be within app data directory
- No path traversal attacks
- Validate against allowed file extensions

This data model provides a comprehensive foundation for implementing the plugin management system with proper relationships, validation, and persistence.