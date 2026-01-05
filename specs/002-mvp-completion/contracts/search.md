# Search API Contract

**Feature**: 002-mvp-completion | **Module**: File Search & Browser Bookmarks
**Purpose**: Tauri commands for file indexing and browser bookmark search

---

## Overview

The search API provides commands for file system indexing, file search, and browser bookmark caching and search.

---

## File Search Commands

### 1. `search_files`

Search indexed files by filename.

**Location**: `src-tauri/src/cmds/search.rs`

**Signature**:
```rust
#[tauri::command]
pub fn search_files(
    query: String,
    limit: usize,
) -> Result<Vec<FileEntry>, String>
```

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | String | Yes | - | Filename search pattern (fuzzy matching) |
| `limit` | usize | No | 50 | Maximum results |

**Returns**: `Result<Vec<FileEntry>, String>`

**FileEntry Structure**:
```typescript
interface FileEntry {
  id: string;
  path: string;          // Full absolute path
  filename: string;      // Name with extension
  extension?: string;    // File extension (without dot)
  file_size: number;     // Size in bytes
  last_modified: number; // Unix timestamp
  is_directory: boolean;
  depth: number;         // Directory depth for ranking
}
```

**Error Conditions**:
- File search not enabled → Feature disabled error
- No indexed paths → Empty results (not an error)

**Performance**: <1s for 10k indexed files

**Examples**:
```typescript
const results = await invoke<FileEntry[]>('search_files', {
  query: 'package.json',
  limit: 20
});
```

---

### 2. `index_files`

Build or update file index for specified paths.

**Signature**:
```rust
#[tauri::command]
pub async fn index_files(
    paths: Vec<String>,
    excluded_dirs: Vec<String>,
) -> Result<IndexStats, String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | Vec<String> | Yes | List of directory paths to index |
| `excluded_dirs` | Vec<String> | No | Directory names to exclude |

**Returns**: `Result<IndexStats, String>`

**IndexStats Structure**:
```typescript
interface IndexStats {
  total_files: number;
  indexed_files: number;
  skipped_files: number;
  errors: number;
  duration_ms: number;
}
```

**Error Conditions**:
- Path does not exist → Invalid path error
- Permission denied → Permission error

**Examples**:
```typescript
const stats = await invoke<IndexStats>('index_files', {
  paths: ['/Users/username/Documents', '/Users/username/Projects'],
  excluded_dirs: ['node_modules', '.git', 'target']
});
console.log(`Indexed ${stats.indexed_files} files`);
```

---

### 3. `get_file_index_stats`

Get current file index statistics.

**Signature**:
```rust
#[tauri::command]
pub fn get_file_index_stats(
) -> Result<FileIndexStats, String>
```

**Returns**: `Result<FileIndexStats, String>`

**FileIndexStats Structure**:
```typescript
interface FileIndexStats {
  total_entries: number;
  indexed_paths: string[];
  last_updated: number;  // Unix timestamp
  index_size_bytes: number;
}
```

---

### 4. `update_browser_cache`

Refresh browser bookmark cache.

**Signature**:
```rust
#[tauri::command]
pub async fn update_browser_cache(
    sources: Vec<String>,  // ["Chrome", "Firefox", "Safari", "Edge"]
) -> Result<BrowserCacheStats, String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sources` | Vec<String> | Yes | Browser sources to update |

**Returns**: `Result<BrowserCacheStats, String>`

**BrowserCacheStats Structure**:
```typescript
interface BrowserCacheStats {
  total_bookmarks: number;
  by_source: Record<string, number>;  // { Chrome: 120, Firefox: 45 }
  duration_ms: number;
  errors: string[];
}
```

**Error Conditions**:
- Browser not installed → Warning (continue with other sources)
- Bookmark database locked → Retry or skip

**Examples**:
```typescript
const stats = await invoke<BrowserCacheStats>('update_browser_cache', {
  sources: ['Chrome', 'Safari']
});
```

---

## Browser Bookmark Commands

### 5. `search_browser_data`

Search cached browser bookmarks.

**Signature**:
```rust
#[tauri::command]
pub fn search_browser_data(
    query: String,
    sources: Option<Vec<String>>,  // Filter by browser
    limit: usize,
) -> Result<Vec<Bookmark>, String>
```

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | String | Yes | - | Search query (title or URL) |
| `sources` | Vec<String> | No | null | Filter to specific browsers |
| `limit` | usize | No | 50 | Maximum results |

**Returns**: `Result<Vec<Bookmark>, String>`

**Bookmark Structure**:
```typescript
interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon_url?: string;
  browser_source: 'Chrome' | 'Firefox' | 'Safari' | 'Edge';
  folder_path?: string;
  date_added: number;  // Unix timestamp
}
```

**Error Conditions**:
- Cache expired (>5 minutes) → Auto-refresh warning
- No bookmarks found → Empty results (not an error)

**Performance**: <200ms for cached results

**Examples**:
```typescript
const bookmarks = await invoke<Bookmark[]>('search_browser_data', {
  query: 'github',
  sources: ['Chrome', 'Safari'],
  limit: 20
});
```

---

### 6. `get_browser_cache_stats`

Get bookmark cache status.

**Signature**:
```rust
#[tauri::command]
pub fn get_browser_cache_stats(
) -> Result<BrowserCacheStats, String>
```

**Returns**: Same `BrowserCacheStats` as `update_browser_cache`

---

## Events

### `file_index:progress`

Emitted during file indexing to report progress.

**Payload**:
```typescript
interface IndexProgress {
  current_path: string;
  files_indexed: number;
  total_files: number;
  percentage: number;
}
```

**Usage**:
```typescript
await listen<IndexProgress>('file_index:progress', (event) => {
  console.log(`Indexing: ${event.payload.percentage}%`);
});
```

### `browser_cache:updated`

Emitted when browser cache is refreshed.

**Payload**: `BrowserCacheStats`

---

## Implementation Notes

### File Indexing
- **Default excluded dirs**: `node_modules`, `.git`, `target`, `dist`, `build`, `.vscode`, `.idea`
- **Max file size**: 10MB (configurable)
- **Incremental updates**: Only re-index changed files (based on `last_modified`)
- **Background processing**: Indexing runs in background thread

### Browser Bookmark Sources
- **Chrome**: `~/Library/Application Support/Google/Chrome/Default/Bookmarks` (JSON)
- **Firefox**: `~/Library/Application Support/Firefox/Profiles/*/places.sqlite` (SQLite)
- **Safari**: `~/Library/Safari/Bookmarks.plist` (Binary plist)
- **Edge**: `~/Library/Application Support/Microsoft Edge/Default/Bookmarks` (JSON)

### Cache Strategy
- Bookmark cache stored in SQLite with 5-minute TTL
- Auto-refresh on search if cache expired
- In-memory cache for fastest access after first load

### Performance Requirements
- `search_files`: <1s for 10k indexed files
- `search_browser_data`: <200ms from cache
- `update_browser_cache`: <3s for 1000 bookmarks

### Cross-Platform Paths
- **macOS**: `~/Library/Application Support/{Browser}/...`
- **Windows**: `%APPDATA%/{Browser}/...`
- **Linux**: `~/.config/{Browser}/...`
