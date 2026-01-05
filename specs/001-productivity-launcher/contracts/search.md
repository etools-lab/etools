# API Contract: Search & Indexing

**Subsystem**: File & Browser Search
**Version**: 1.0.0
**Status**: Draft

---

## Overview

This contract defines the Tauri commands for file indexing, browser data caching, and unified search.

---

## Commands

### `search`

Performs a unified search across all data sources.

**Request**:
```typescript
interface SearchRequest {
  query: string;          // Search query
  limit?: number;         // Max results per source (default: 10)
  sources?: SearchResultType[];  // Filter by source type (optional)
}

type SearchResultType =
  | 'app'
  | 'file'
  | 'clipboard'
  | 'bookmark'
  | 'history'
  | 'plugin'
  | 'action';
```

**Response**:
```typescript
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type: SearchResultType;
  score: number;          // Relevance score (0-1)
  source?: string;        // Source plugin/app ID
  data: any;             // Source-specific data
}

interface SearchResponse {
  results: SearchResult[];
  total: number;          // Total results across all sources
  queryTime: number;      // Time taken (ms)
}
```

---

### `index_files`

Initiates or updates the file index.

**Request**:
```typescript
interface IndexFilesRequest {
  paths?: string[];       // Paths to index (default: from settings)
  force?: boolean;        // Force full re-index (default: false)
}
```

**Response**:
```typescript
interface IndexFilesResponse {
  indexed: number;        // Files indexed
  updated: number;        // Files updated
  removed: number;        // Files removed
  duration: number;       // Time taken (ms)
}
```

**Events**:
Emits `index:progress` events during indexing:

```typescript
interface IndexProgressEvent {
  phase: 'scanning' | 'indexing' | 'complete';
  current: number;
  total: number;
  path?: string;          // Current path being indexed
}
```

---

### `get_file_index_stats`

Returns statistics about the file index.

**Request**:
```typescript
// No parameters
```

**Response**:
```typescript
interface FileIndexStats {
  totalFiles: number;
  totalSize: number;      // Total indexed size in bytes
  lastUpdate: number;     // Last index update timestamp
  paths: string[];        // Indexed paths
  excludedDirs: string[]; // Excluded directories
}

interface GetFileIndexStatsResponse {
  stats: FileIndexStats;
}
```

---

### `update_browser_cache`

Refreshes the browser data cache.

**Request**:
```typescript
interface UpdateBrowserCacheRequest {
  browsers?: ('chrome' | 'edge' | 'firefox' | 'safari')[];
  force?: boolean;        // Force refresh (ignore cache expiry)
}
```

**Response**:
```typescript
interface BrowserCacheStats {
  browser: string;
  bookmarks: number;
  history: number;
  lastUpdate: number;
}

interface UpdateBrowserCacheResponse {
  stats: BrowserCacheStats[];
  duration: number;       // Time taken (ms)
}
```

**Errors**:
- `BROWSER_NOT_FOUND`: Browser not installed or data not accessible
- `DATABASE_LOCKED`: Browser database is locked (will retry)

---

### `search_files`

File-specific search (bypasses unified search).

**Request**:
```typescript
interface SearchFilesRequest {
  query: string;
  limit?: number;
  path?: string;          // Limit to specific path (optional)
  extensions?: string[];  // Filter by file extensions (optional)
}
```

**Response**:
```typescript
interface FileSearchResult {
  id: string;             // File path
  filename: string;
  path: string;
  extension: string;
  size: number;
  modified: number;
  score: number;
}

interface SearchFilesResponse {
  results: FileSearchResult[];
  total: number;
  queryTime: number;
}
```

---

### `search_browser_data`

Browser-specific search (bypasses unified search).

**Request**:
```typescript
interface SearchBrowserDataRequest {
  query: string;
  type?: 'bookmark' | 'history' | 'all';
  browsers?: ('chrome' | 'edge' | 'firefox' | 'safari')[];
  limit?: number;
}
```

**Response**:
```typescript
interface BrowserSearchResult {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  browser: string;
  type: 'bookmark' | 'history';
  visitCount?: number;
  lastVisited?: number;
  folder?: string;        // For bookmarks
}

interface SearchBrowserDataResponse {
  results: BrowserSearchResult[];
  total: number;
  queryTime: number;
}
```

---

## File System Events

### `fs:change`

Emitted when indexed files are created, modified, or deleted.

**Event Data**:
```typescript
interface FileSystemChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: number;
}
```

---

## Search Scoring Algorithm

```typescript
interface ScoringConfig {
  fuzzyWeight: number;     // Text match score weight (default: 0.5)
  frequencyWeight: number; // Usage frequency weight (default: 0.3)
  typeWeight: number;      // Type priority weight (default: 0.2)
}

type TypePriority = {
  app: 1.0;
  clipboard: 0.9;
  bookmark: 0.8;
  history: 0.7;
  file: 0.6;
  plugin: 0.5;
};

function calculateScore(
  fuzzyScore: number,
  frequency: number,
  type: SearchResultType
): number {
  const typeBoost = TypePriority[type];
  const frequencyBoost = Math.min(frequency / 100, 1.0);

  return (
    fuzzyScore * config.fuzzyWeight +
    frequencyBoost * config.frequencyWeight +
    typeBoost * config.typeWeight
  );
}
```

---

## File Indexing Strategy

### Initial Scan

```typescript
// Recursive directory walk
async function scanDirectory(
  path: string,
  depth: number = 0,
  maxDepth: number = 10
): Promise<FileEntry[]> {
  if (depth > maxDepth) return [];
  if (isExcludedDir(path)) return [];

  const entries = await readDirectory(path);
  const results: FileEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      const subResults = await scanDirectory(entry.path, depth + 1, maxDepth);
      results.push(...subResults);
    } else if (shouldIndexFile(entry)) {
      results.push(await indexFile(entry));
    }
  }

  return results;
}
```

### Incremental Updates

```typescript
// Platform-specific file system watchers
const WATCHERS = {
  macos: 'FSEvents',
  windows: 'ReadDirectoryChangesW',
  linux: 'inotify'
};

// Debounce batch updates (500ms)
function onFileSystemChange(events: FileSystemChangeEvent[]) {
  const batch = debounce(events, 500);
  for (const event of batch) {
    if (event.type === 'deleted') {
      db.deleteFile(event.path);
    } else {
      db.upsertFile(await indexFile(event.path));
    }
  }
}
```

---

## Browser Data Access

### Database Lock Handling

```typescript
// Copy database to temp file before reading
async function readBrowserDatabase(
  browser: string,
  dbPath: string
): Promise<BrowserData> {
  const tempPath = await copyFile(dbPath, getTempDir());

  try {
    const db = await openDatabase(tempPath);
    const data = await extractBrowserData(browser, db);
    return data;
  } finally {
    await unlink(tempPath);
  }
}
```

### Cache Expiry

```typescript
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

async function getBrowserData(browser: string) {
  const cached = await db.getBrowserCache(browser);

  if (cached && Date.now() - cached.lastUpdate < CACHE_EXPIRY) {
    return cached;
  }

  // Refresh cache
  const fresh = await readBrowserDatabase(browser, getBrowserPath(browser));
  await db.saveBrowserCache(browser, fresh);
  return fresh;
}
```

---

## Performance Requirements

| Operation | Target Latency | Notes |
|-----------|----------------|-------|
| search (unified) | <200ms | For 50k indexed items |
| index_files (initial) | <30s | For 100k files |
| index_files (incremental) | <1s | Per batch of changes |
| update_browser_cache | <5s | All browsers |

---

## Security Considerations

1. **Path Validation**: All paths must be validated and normalized
2. **Permission Checks**: Respect file system permissions
3. **Excluded Paths**: Never index sensitive paths (`/.ssh`, `~/.gnupg`, etc.)
4. **Plugin Access**: Requires `fs:read` permission for file search
