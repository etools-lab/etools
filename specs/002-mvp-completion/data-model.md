# Data Model: MVP Completion & Enhancement

**Feature**: 002-mvp-completion | **Date**: 2025-01-01
**Purpose**: Define data entities and relationships for clipboard, file search, browser bookmarks, and plugin systems

---

## Overview

This document defines the data models for the MVP completion feature. All entities are derived from the functional requirements in the specification and implement the validation rules and state transitions needed for each feature.

---

## Entity 1: ClipboardItem

**Purpose**: Represents a single clipboard history entry with content, metadata, and sensitivity flag.

### Fields

| Field | Type | Nullable | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID (String) | No | Unique identifier for the clipboard item | UUID v4 format |
| `content_type` | Enum | No | Type of clipboard content | Values: `Text`, `Image`, `Html`, `File` |
| `text` | String | Yes | Text content (for Text/Html types) | Max 10MB |
| `image_path` | String | Yes | Path to stored image file | Valid file path |
| `hash` | String | No | Content hash for deduplication | SHA-256 hex |
| `timestamp` | DateTime | No | When the content was copied | ISO 8601 |
| `is_sensitive` | Boolean | No | Whether content is sensitive (passwords, API keys) | Auto-detected via regex |
| `app_source` | String | Yes | Application that copied the content | Bundle identifier or process name |

### Relationships

- **None** - Clipboard items are independent entities

### State Transitions

```
[Created] → [Stored] → [Maybe Sensitive] → [Auto-Deleted after 2min if sensitive]
                    ↓
                 [User Deleted]
                    ↓
                 [Expired] → [Removed when >1000 items]
```

### Validation Rules

1. **Deduplication**: Items with same `hash` within 5 minutes are considered duplicates
2. **Size limit**: `text` field max 10MB, larger items are truncated with warning
3. **Sensitive detection**: Automatically flagged if matches password/API key patterns
4. **Auto-cleanup**: Sensitive items deleted 2 minutes after creation
5. **Capacity limit**: Oldest items removed when total count > 1000

### Database Schema (SQLite)

```sql
CREATE TABLE clipboard_history (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL CHECK(content_type IN ('Text', 'Image', 'Html', 'File')),
    text TEXT,
    image_path TEXT,
    hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,  -- Unix timestamp
    is_sensitive INTEGER NOT NULL DEFAULT 0,
    app_source TEXT
);

CREATE INDEX idx_clipboard_timestamp ON clipboard_history(timestamp DESC);
CREATE INDEX idx_clipboard_hash ON clipboard_history(hash);
CREATE INDEX idx_clipboard_sensitive ON clipboard_history(is_sensitive, timestamp);
```

---

## Entity 2: FileEntry

**Purpose**: Represents a file in the file index for fast filename search.

### Fields

| Field | Type | Nullable | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID (String) | No | Unique identifier | UUID v4 format |
| `path` | String | No | Full file path | Valid absolute path |
| `filename` | String | No | File name with extension | Non-empty |
| `extension` | String | Yes | File extension (without dot) | e.g., "txt", "md", "rs" |
| `file_size` | Integer | No | File size in bytes | >= 0 |
| `last_modified` | DateTime | No | Last modification time | ISO 8601 |
| `is_directory` | Boolean | No | Whether entry is a directory | - |
| `depth` | Integer | No | Directory depth from root | >= 0, used for ranking |

### Relationships

- **None** - File entries are independent (no foreign keys)

### State Transitions

```
[Discovered during index] → [Indexed] → [Updated on file change]
                                          ↓
                                       [Deleted on file removal]
```

### Validation Rules

1. **Path uniqueness**: One entry per unique `path`
2. **Depth calculation**: `depth = path.components().count() - base_path.components().count()`
3. **Excluded directories**: Skip `node_modules`, `.git`, `target`, `dist`, `build`, `.vscode`, `.idea`
4. **Max file size**: Skip files > 10MB (configurable in settings)
5. **Fuzzy search**: Search uses `LIKE %pattern%` on `filename` only (not path)

### Database Schema (SQLite)

```sql
CREATE TABLE file_entries (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    extension TEXT,
    file_size INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,  -- Unix timestamp
    is_directory INTEGER NOT NULL DEFAULT 0,
    depth INTEGER NOT NULL
);

CREATE INDEX idx_files_filename ON file_entries(filename);
CREATE INDEX idx_files_path ON file_entries(path);
CREATE INDEX idx_files_extension ON file_entries(extension);
CREATE INDEX idx_files_search ON file_entries(filename, depth, last_modified);
```

---

## Entity 3: Bookmark

**Purpose**: Represents a browser bookmark loaded from browser databases.

### Fields

| Field | Type | Nullable | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | UUID (String) | No | Unique identifier | UUID v4 format |
| `url` | String | No | Bookmark URL | Valid URL format |
| `title` | String | No | Bookmark title | Non-empty |
| `favicon_url` | String | Yes | URL to favicon image | Valid URL or empty |
| `browser_source` | Enum | No | Which browser this came from | Values: `Chrome`, `Firefox`, `Safari`, `Edge` |
| `folder_path` | String | Yes | Bookmark folder hierarchy | e.g., "Bookmarks Bar/Development" |
| `date_added` | DateTime | No | When bookmark was created | ISO 8601 |

### Relationships

- **None** - Bookmarks are independent (cached from browser)

### State Transitions

```
[Loaded from browser] → [Cached in SQLite] → [Refreshed every 5min]
                                              ↓
                                           [Browser closed/bookmark deleted]
```

### Validation Rules

1. **URL format**: Must be valid HTTP/HTTPS URL
2. **Title fallback**: Use URL hostname if title is empty
3. **Deduplication**: Same URL from different browsers creates separate entries
4. **Cache TTL**: Entries refreshed every 5 minutes

### Database Schema (SQLite)

```sql
CREATE TABLE bookmark_cache (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    favicon_url TEXT,
    browser_source TEXT NOT NULL CHECK(browser_source IN ('Chrome', 'Firefox', 'Safari', 'Edge')),
    folder_path TEXT,
    date_added INTEGER NOT NULL,  -- Unix timestamp
    cache_timestamp INTEGER NOT NULL  -- When this cache entry was created
);

CREATE INDEX idx_bookmarks_url ON bookmark_cache(url);
CREATE INDEX idx_bookmarks_title ON bookmark_cache(title);
CREATE INDEX idx_bookmarks_source ON bookmark_cache(browser_source);
CREATE INDEX idx_bookmarks_cache_time ON bookmark_cache(cache_timestamp);
```

---

## Entity 4: PluginManifest

**Purpose**: Metadata and configuration for an installed plugin.

### Fields

| Field | Type | Nullable | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | String | No | Unique plugin identifier | Alphanumeric + hyphens/underscores |
| `name` | String | No | Human-readable plugin name | Non-empty |
| `version` | String | No | Semantic version | e.g., "1.0.0" |
| `description` | String | No | Plugin description | Non-empty |
| `author` | String | Yes | Plugin author name or email | - |
| `triggers` | Array | No | Keywords that invoke plugin | e.g., ["qr:", "qrcode:"] |
| `permissions` | Array | No | Required permissions | Values from PluginPermission enum |
| `entry` | String | No | Entry point file path | Relative to plugin directory |
| `settings_schema` | Object | Yes | Plugin settings definition | JSON Schema format |
| `enabled` | Boolean | No | Whether plugin is active | Default: true |

### Relationships

- **One-to-Many** with PluginSettings (each plugin can have multiple user-configured settings)

### State Transitions

```
[Installed] → [Validated] → [Enabled] → [Executing]
                ↓              ↓
            [Validation Failed]  [Disabled]
                                      ↓
                                   [Uninstalled]
```

### Validation Rules

1. **ID format**: Alphanumeric with hyphens/underscores only
2. **Trigger format**: Must end with colon (`:`)
3. **Version format**: Semantic versioning (MAJOR.MINOR.PATCH)
4. **Permissions**: Must be from allowed set (`read_clipboard`, `write_clipboard`, `read_file`, `write_file`, `network`, `shell`, `notification`)
5. **Entry point**: File must exist in plugin directory
6. **Manifest location**: `~/.config/kaka/plugins/{plugin_id}/plugin.json`

### File Structure

```json
{
  "id": "qrcode-generator",
  "name": "QR Code Generator",
  "version": "1.0.0",
  "description": "Generate QR codes from text",
  "author": "Kaka Team",
  "triggers": ["qr:", "qrcode:"],
  "permissions": ["network"],
  "entry": "index.ts",
  "settings_schema": {
    "size": {
      "type": "integer",
      "default": 200,
      "min": 100,
      "max": 500
    }
  }
}
```

---

## Entity 5: PluginSettings (User-Configured)

**Purpose**: User-configured settings for a plugin instance.

### Fields

| Field | Type | Nullable | Description | Validation |
|-------|------|----------|-------------|------------|
| `plugin_id` | String | No | Reference to plugin | Foreign key to PluginManifest.id |
| `key` | String | No | Setting name | Alphanumeric + underscore |
| `value` | JSON | No | Setting value | Must match schema in PluginManifest |

### Relationships

- **Many-to-One** with PluginManifest (belongs to one plugin)

### Validation Rules

1. **Schema validation**: `value` must validate against `settings_schema` in PluginManifest
2. **Type checking**: JSON value type must match schema (string, number, boolean, etc.)
3. **Range constraints**: Numbers must be within min/max from schema

### Database Schema (SQLite)

```json
// Stored as JSON file: ~/.config/kaka/plugin-settings.json
{
  "qrcode-generator": {
    "size": 300,
    "error_correction": "M"
  }
}
```

---

## Entity 6: ColorConversion (Transient)

**Purpose**: Runtime representation of color conversion result (not persisted).

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `input` | String | Original color input (e.g., "#ff0000", "rgb(255, 0, 0)") |
| `hex` | String | Hex format (#rrggbb or #rrggbbaa) |
| `rgb` | String | RGB format (rgb(r, g, b) or rgba(r, g, b, a)) |
| `hsl` | String | HSL format (hsl(h, s%, l%) or hsla(h, s%, l%, a)) |
| `named` | String | Named color if applicable (e.g., "red") |
| `swatch` | String | CSS color string for visual preview |

### State Transitions

```
[Input detected] → [Format recognized] → [Converted to all formats] → [Displayed to user]
                                                               ↓
                                                          [User selects]
                                                               ↓
                                                    [Copied to clipboard]
```

### Validation Rules

1. **Input patterns**:
   - Hex: `/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i`
   - RGB: `/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i`
   - HSL: `/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i`
   - Named: Must be in CSS named color list (147 colors)
2. **Range validation**: RGB 0-255, H 0-360, S/L 0-100%
3. **Alpha channel**: Optional, 0-1 for rgba/hsla

---

## Cross-Entity Relationships

```
┌─────────────────┐
│  ClipboardItem  │
└─────────────────┘

┌─────────────────┐
│   FileEntry     │
└─────────────────┘

┌─────────────────┐
│    Bookmark     │
└─────────────────┘

┌─────────────────┐       ┌──────────────────┐
│ PluginManifest  │───────│ PluginSettings   │
└─────────────────┘       └──────────────────┘
        1                           N
```

All entities are independent except PluginManifest → PluginSettings (one-to-many).

---

## Data Access Patterns

### Clipboard History

```rust
// Create new clipboard item
fn create_clipboard_item(content: ClipboardContent) -> Result<ClipboardItem>

// Get recent history (limit 100)
fn get_clipboard_history(limit: usize) -> Result<Vec<ClipboardItem>>

// Search clipboard by text
fn search_clipboard(query: &str, limit: usize) -> Result<Vec<ClipboardItem>>

// Delete specific item
fn delete_clipboard_item(id: &str) -> Result<()>

// Get item for pasting
fn get_clipboard_item(id: &str) -> Result<ClipboardItem>

// Cleanup old items (>1000)
fn cleanup_old_clipboard_items() -> Result<()>

// Cleanup sensitive items (>2 minutes)
fn cleanup_sensitive_items() -> Result<()>
```

### File Index

```rust
// Add or update file entry
fn upsert_file_entry(path: &Path) -> Result<FileEntry>

// Search files by filename
fn search_files(query: &str, limit: usize) -> Result<Vec<FileEntry>>

// Remove deleted file
fn remove_file_entry(path: &Path) -> Result<()>

// Rebuild index
fn rebuild_file_index(paths: &[PathBuf]) -> Result<usize>
```

### Bookmark Cache

```rust
// Load bookmarks from browser
fn load_browser_bookmarks(browser: Browser) -> Result<Vec<Bookmark>>

// Cache bookmarks
fn cache_bookmarks(bookmarks: &[Bookmark]) -> Result<()>

// Search bookmarks
fn search_bookmarks(query: &str, limit: usize) -> Result<Vec<Bookmark>>

// Refresh cache (if >5 minutes old)
fn refresh_bookmark_cache() -> Result<()>
```

### Plugin System

```rust
// Load plugin manifest
fn load_plugin_manifest(plugin_id: &str) -> Result<PluginManifest>

// Validate manifest
fn validate_plugin_manifest(manifest: &PluginManifest) -> Result<ValidationResult>

// List installed plugins
fn list_plugins() -> Result<Vec<PluginManifest>>

// Enable/disable plugin
fn set_plugin_enabled(plugin_id: &str, enabled: bool) -> Result<()>

// Get plugin settings
fn get_plugin_settings(plugin_id: &str) -> Result<PluginSettings>

// Set plugin setting
fn set_plugin_setting(plugin_id: &str, key: &str, value: JsonValue) -> Result<()>
```

---

## Indexing Strategy

### Performance-Critical Queries

1. **Clipboard history by timestamp**: `idx_clipboard_timestamp` for recent items
2. **Clipboard sensitive cleanup**: `idx_clipboard_sensitive` for auto-deletion
3. **File search**: `idx_files_search` composite index for fast LIKE queries
4. **Bookmark cache refresh**: `idx_bookmarks_cache_time` for TTL checks

### Query Optimization

```sql
-- Clipboard search with ranking
SELECT * FROM clipboard_history
WHERE text LIKE ?1
ORDER BY timestamp DESC
LIMIT ?2;

-- File search with relevance scoring
SELECT
    path, filename,
    (LENGTH(filename) - INSTR(LOWER(filename), LOWER(?1))) / (depth + 1) as score
FROM file_entries
WHERE filename LIKE ?1
ORDER BY score DESC, last_modified DESC
LIMIT ?2;

-- Bookmark search with cache filter
SELECT * FROM bookmark_cache
WHERE title LIKE ?1 OR url LIKE ?1
AND cache_timestamp > ?2  -- Only fresh cache entries
ORDER BY date_added DESC
LIMIT ?3;
```

---

## Migration Strategy

All entities are new for this feature, no migration from existing data. Database initialization:

1. Create tables on first application launch
2. Load default settings (file search disabled, browser sources empty)
3. Run initial file index if user enables file search
4. Load browser bookmarks on first search (lazy loading)
