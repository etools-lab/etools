# Data Model: Productivity Launcher

**Feature**: 001-productivity-launcher
**Date**: 2025-12-30
**Status**: Phase 1 - Design Complete

This document defines all data entities, their relationships, and validation rules for the Productivity Launcher.

---

## Entity Relationship Diagram

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  Search     │──┬───→│  Clipboard  │      │   Plugin     │
│  Result     │  │    │    Item     │      │              │
└─────────────┘  │    └─────────────┘      └──────┬───────┘
                 │                                │
                 ├──────────┬──────────────┬──────┘
                 │          │              │
                 ▼          ▼              ▼
        ┌─────────────┐ ┌──────────┐ ┌──────────┐
        │ Application │ │ File     │ │ Browser  │
        │   Entry     │ │  Index   │ │  Data    │
        └─────────────┘ └──────────┘ └──────────┘
                                                    │
                                                    ▼
                                          ┌─────────────┐
                                          │   User      │
                                          │ Preference  │
                                          └─────────────┘
```

---

## Core Entities

### 1. Application Entry

**Purpose**: Represents an installed desktop application that can be launched.

**Storage**: In-memory cache (scanned from filesystem)

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique identifier (hash of path) | Required, unique |
| `name` | string | Application display name | Required, non-empty |
| `executablePath` | string | Absolute path to executable | Required, exists on filesystem |
| `icon` | string | Icon data URI or path | Optional |
| `usageCount` | number | Times launched | Default: 0 |
| `lastLaunched` | timestamp | Last launch time | Optional |
| `platform` | enum | `macos` \| `windows` \| `linux` | Required |

**Platform-Specific Sources**:
- **macOS**: `.app` bundles from `/Applications` and `~/Applications`
- **Windows**: Registry uninstall keys + Start Menu `.lnk` files
- **Linux**: `.desktop` files from `/usr/share/applications/` and `~/.local/share/applications/`

---

### 2. Clipboard Item

**Purpose**: Represents a single clipboard history entry.

**Storage**: JSON files (rotating, max 100MB total)

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique identifier (UUID) | Required, unique |
| `content` | string \| binary | Clipboard content (text or image) | Required |
| `contentType` | enum | `text` \| `image` \| `html` | Required |
| `timestamp` | timestamp | When copied | Required |
| `sourceApp` | string | Application that copied | Optional |
| `contentHash` | string | SHA-256 for deduplication | Required |
| `expiresAt` | timestamp | Auto-expiration time | Optional |
| `size` | number | Content size in bytes | Required, max 10MB |

**File Structure**:
```
~/Library/Application Support/kaka/clipboard/
├── 2025-12-30.json    # One file per day
├── 2025-12-29.json
└── 2025-12-28.json
```

**Expiration Rules**:
- Password manager entries: 2 minutes (default)
- Regular entries: 30 days
- Max 1000 entries total (FIFO eviction)

---

### 3. Plugin

**Purpose**: Represents an installed or available plugin.

**Storage**: JSON files in `plugins/` directory

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique plugin identifier | Required, format: `author.name` |
| `name` | string | Display name | Required, non-empty |
| `version` | string | SemVer version | Required, valid SemVer |
| `author` | string | Plugin author | Required |
| `description` | string | Short description | Required |
| `permissions` | string[] | Granted permissions | See Permission Model below |
| `triggers` | string[] | Keyword triggers | Optional |
| `entry` | string | Path to entry point | Required, `.js` or `.ts` |
| `icon` | string | Icon data URI | Optional |
| `installed` | boolean | Installation status | Required |
| `enabled` | boolean | Active status | Default: true |
| `rating` | number | User rating (0-5) | Optional |
| `installDate` | timestamp | When installed | Optional |

**Permission Model**:
```typescript
type Permission =
  | 'clipboard:read'     // Read clipboard content
  | 'clipboard:write'    // Write to clipboard
  | 'fs:read'           // Read files
  | 'fs:write'          // Write files
  | 'shell:execute'     // Run shell commands
  | 'network:request'   // Make HTTP requests
  | 'ui:render'         // Render custom UI
  | 'search:register'   // Register search handlers
  ;
```

**Plugin Directory Structure**:
```
plugins/
├── installed.json           # Registry of installed plugins
├── author.plugin-name/
│   ├── plugin.json         # Manifest
│   ├── index.ts            # Entry point
│   ├── assets/             # Icons, etc.
│   └── package.json        # NPM dependencies
└── builtin/
    ├── calculator/
    ├── color-converter/
    └── timestamp/
```

---

### 4. Search Result

**Purpose**: Represents a single item in search results (unified across all sources).

**Storage**: In-memory (transient)

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique identifier | Required |
| `title` | string | Primary display text | Required |
| `subtitle` | string | Secondary display text | Optional |
| `icon` | string | Icon data URI | Optional |
| `type` | enum | Source type | Required |
| `action` | function | Action handler | Required |
| `score` | number | Relevance score (0-1) | Required |
| `source` | string | Source plugin/app ID | Optional |

**Type Enum Values**:
```typescript
type SearchResultType =
  | 'app'              // Application
  | 'file'             // Local file
  | 'clipboard'        // Clipboard history
  | 'bookmark'         // Browser bookmark
  | 'history'          // Browser history
  | 'plugin'           // Plugin result
  | 'action'           // Quick action (calculator, etc.)
  | 'url'              // Direct URL
  ;
```

**Scoring Algorithm**:
```typescript
score = (
  fuseScore * 0.5 +           // Text match (fuzzy)
  frequencyBoost * 0.3 +      // Usage frequency
  typeBoost * 0.2             // Type priority
);
```

---

### 5. File Index Entry

**Purpose**: Represents a file in the local file system index.

**Storage**: SQLite database `files_index.db`

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | integer | Primary key | Auto-increment |
| `path` | string | Absolute file path | Required, unique |
| `filename` | string | File name with extension | Required |
| `extension` | string | File extension (without dot) | Optional |
| `size` | integer | File size in bytes | Required |
| `modified` | timestamp | Last modified time | Required |
| `hidden` | boolean | Is hidden file | Default: false |
| `indexed` | timestamp | When added to index | Auto-generated |

**SQLite Schema**:
```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT,
  size INTEGER NOT NULL,
  modified INTEGER NOT NULL,
  hidden BOOLEAN DEFAULT 0,
  indexed INTEGER NOT NULL
);

CREATE INDEX idx_filename ON files(filename);
CREATE INDEX idx_extension ON files(extension);
CREATE INDEX idx_path ON files(path);
```

**Indexing Rules**:
- Skip directories: `node_modules/`, `.git/`, `vendor/`, `target/`, `bin/`, `obj/`
- Skip extensions: `.lock`, `.log`, `.tmp`, `.cache`
- Skip hidden files by default (respectable setting)
- Max depth: 10 levels (configurable)

---

### 6. Browser Bookmark/History

**Purpose**: Represents a web resource from browser data.

**Storage**: SQLite database `browser_cache.db`

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | integer | Primary key | Auto-increment |
| `url` | string | Full URL | Required |
| `title` | string | Page title | Required |
| `favicon` | string | Favicon URL | Optional |
| `browser` | enum | Source browser | Required |
| `type` | enum | `bookmark` \| `history` | Required |
| `visitCount` | number | Visit count (history only) | Default: 0 |
| `lastVisited` | timestamp | Last visit | Optional |
| `folder` | string | Bookmark folder | Optional |
| `cached` | timestamp | When cached | Auto-generated |

**SQLite Schema**:
```sql
CREATE TABLE browser_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  favicon TEXT,
  browser TEXT NOT NULL,  -- 'chrome', 'edge', 'firefox', 'safari'
  type TEXT NOT NULL,     -- 'bookmark', 'history'
  visitCount INTEGER DEFAULT 0,
  lastVisited INTEGER,
  folder TEXT,
  cached INTEGER NOT NULL
);

CREATE INDEX idx_url ON browser_data(url);
CREATE INDEX idx_title ON browser_data(title);
CREATE INDEX idx_browser_type ON browser_data(browser, type);
```

**Browser Data Paths**:
| Browser | Platform | History Path | Bookmarks Path |
|---------|----------|--------------|----------------|
| Chrome | macOS | `~/Library/Application Support/Google/Chrome/Default/History` | Same file |
| Chrome | Windows | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\History` | Same file |
| Chrome | Linux | `~/.config/google-chrome/Default/History` | Same file |
| Firefox | All | `~/Library/Application Support/Firefox/Profiles/*/places.sqlite` | Same file |
| Safari | macOS | `~/Library/Safari/History.db` | `~/Library/Safari/Bookmarks.plist` |
| Edge | macOS | `~/Library/Application Support/Microsoft Edge/Default/History` | Same file |

---

### 7. User Preference

**Purpose**: Represents a user-configurable setting.

**Storage**: JSON file `preferences.json`

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `key` | string | Preference key | Required |
| `value` | any | Preference value | Required |
| `type` | enum | `string` \| `number` \| `boolean` \| `object` | Required |
| `category` | string | Setting category | Required |
| `defaultValue` | any | Default value | Required |

**Default Preferences**:
```json
{
  "hotkey": {
    "key": "hotkey",
    "value": "Cmd+Space",
    "type": "string",
    "category": "general",
    "defaultValue": "Cmd+Space"
  },
  "theme": {
    "key": "theme",
    "value": "dark",
    "type": "string",
    "category": "appearance",
    "defaultValue": "dark"
  },
  "clipboardEnabled": {
    "key": "clipboardEnabled",
    "value": true,
    "type": "boolean",
    "category": "features",
    "defaultValue": true
  },
  "clipboardMaxItems": {
    "key": "clipboardMaxItems",
    "value": 1000,
    "type": "number",
    "category": "features",
    "defaultValue": 1000
  },
  "fileIndexEnabled": {
    "key": "fileIndexEnabled",
    "value": true,
    "type": "boolean",
    "category": "features",
    "defaultValue": true
  },
  "fileIndexPaths": {
    "key": "fileIndexPaths",
    "value": ["~/Documents", "~/Desktop"],
    "type": "array",
    "category": "features",
    "defaultValue": []
  },
  "excludedApps": {
    "key": "excludedApps",
    "value": ["1Password", "Bitwarden"],
    "type": "array",
    "category": "features",
    "defaultValue": []
  }
}
```

---

## Relationships

### Entity Relationships

```
ApplicationEntry ─┐
                  ├──→ SearchResult (via search)
                  │
ClipboardItem ────┤
                  │
FileIndexEntry ───┼──→ SearchService (aggregates results)
                  │
BrowserData ──────┤
                  │
Plugin ───────────┘

UserPreference ─→ AppConfig (global settings)
```

### Lifecycle State Transitions

**Plugin States**:
```
[Not Installed] → [Installed] → [Enabled] ⇄ [Disabled] → [Uninstalled]
                      ↓
                   [Error] (crashed, incompatible)
```

**Clipboard Item States**:
```
[Active] → [Expiring] → [Expired] → [Deleted]
            ↑
         (2 min for sensitive, 30 days normal)
```

**File Index States**:
```
[Not Indexed] → [Indexed] → [Updated] → [Deleted]
                   ↑
              (on file change)
```

---

## Validation Rules

### Cross-Entity Validation

1. **Unique IDs**: All `id` fields must be unique within their entity type
2. **Timestamps**: All timestamps must be Unix milliseconds (not seconds)
3. **Paths**: All file paths must be absolute (not relative)
4. **URLs**: All URLs must include protocol (`http://`, `https://`, `file://`)
5. **Enum Values**: All enum fields must use defined values only

### Data Size Limits

| Entity | Max Records | Max Size per Record | Total Max Size |
|--------|-------------|---------------------|----------------|
| ClipboardItem | 1000 | 10MB | 100MB (rolling) |
| FileIndexEntry | 100,000 | N/A | 50MB SQLite |
| BrowserData | 50,000 | N/A | 20MB SQLite |
| Plugin | 1000 | N/A | 100MB total |
| SearchResult | 100 (in memory) | N/A | N/A |

### Performance Constraints

| Operation | Max Latency | Notes |
|-----------|-------------|-------|
| Search query | 200ms | For 50k indexed items |
| App launch | 500ms | OS-dependent |
| Clipboard capture | 100ms | Polling interval: 500ms |
| File index update | 1s | Per batch of changes |
| Plugin load | 200ms | Per plugin |

---

**Status**: ✅ Phase 1 Data Model Complete
**Next**: API Contracts Generation
