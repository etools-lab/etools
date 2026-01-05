# Technical Research: Productivity Launcher

**Feature**: 001-productivity-launcher
**Date**: 2025-12-30
**Status**: Phase 0 Complete

This document captures technical research and design decisions for the Productivity Launcher project.

---

## 1. Application Discovery & Launching

### Decision: Platform-Specific App Discovery

**Chosen Approach**:
- **macOS**: Scan `/Applications` and `~/Applications` directories; parse `.app` bundles using `Info.plist`
- **Windows**: Query registry keys (`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`) and scan start menu directories
- **Linux**: Scan desktop entries from `/usr/share/applications/` and `~/.local/share/applications/`

**Rationale**:
- Native OS APIs provide the most reliable app discovery
- Each platform has standard locations for installed applications
- Parsing platform-specific formats (Info.plist, registry, .desktop files) yields complete metadata

**Alternatives Considered**:
1. **Using third-party libraries**: Rejected due to dependency overhead and potential licensing issues
2. **User-configured app paths**: Rejected as too high friction for users

---

## 2. Clipboard Monitoring

### Decision: Platform-Specific Clipboard APIs

**Chosen Approach**:
- **macOS**: Use `NSPasteboard` via Tauri native plugin
- **Windows**: Use Windows Clipboard API via Tauri native plugin
- **Linux**: Use X11/Wayland clipboard APIs

**Implementation Strategy**:
- Poll every 500ms for clipboard changes (Tauri doesn't support clipboard events)
- Detect changes by comparing clipboard content hash
- Store in SQLite with automatic expiration for sensitive items

**Rationale**:
- Native APIs provide robust clipboard access
- Polling is a reasonable trade-off given clipboard changes are infrequent
- SQLite provides efficient querying and automatic cleanup

**Alternatives Considered**:
1. **File-based storage**: Rejected due to poor query performance for searching history
2. **In-memory only**: Rejected as clipboard history must persist across restarts (FR-012)

---

## 3. File Indexing

### Decision: Incremental SQLite Index with File System Watcher

**Chosen Approach**:
- **Indexing**: Walk file system recursively, store metadata (path, name, extension, size, mtime) in SQLite
- **Updates**: Use platform file system watchers (FSEvents on macOS, ReadDirectoryChangesW on Windows, inotify on Linux)
- **Search**: SQL `LIKE` queries with fuse.js for fuzzy matching in frontend

**Implementation Details**:
- Initial full scan on first launch
- Incremental updates via file system events
- Respect hidden file settings (`.hidden` files, `.*` on Unix)
- Skip common exclusions: `node_modules/`, `.git/`, `vendor/`, etc.

**Rationale**:
- SQLite provides sub-100ms queries for 50k+ files
- File system watchers enable near real-time updates
- Filename-only indexing (not content) keeps index size manageable

**Alternatives Considered**:
1. **Content indexing (ripgrep, everything)**: Rejected due to performance and complexity (not in v1 scope)
2. **No indexing, live file search**: Rejected due to poor performance on large directories

---

## 4. Browser Data Access

### Decision: Direct SQLite Database Reading

**Chosen Approach**:
- **Chrome/Edge**: Read `History` and `Bookmarks` SQLite databases
- **Firefox**: Read `places.sqlite` database
- **Safari**: Read `~/Library/Safari/History.db` and `Bookmarks.plist`

**Implementation Strategy**:
- Handle database locks by copying to temp file before reading
- Cache results with periodic refresh (every 5 minutes)
- Update on browser close detection

**Browser Data Paths**:
| Browser | History | Bookmarks |
|---------|---------|-----------|
| Chrome | `~/Library/Application Support/Google/Chrome/Default/History` | Same file (bookmarks table) |
| Edge | `~/Library/Application Support/Microsoft Edge/Default/History` | Same file |
| Firefox | `~/Library/Application Support/Firefox/Profiles/*/places.sqlite` | Same file |
| Safari | `~/Library/Safari/History.db` | `~/Library/Safari/Bookmarks.plist` |

**Rationale**:
- Direct database reading is fast and reliable
- Browser databases are well-documented SQLite formats
- Copy approach handles locks when browser is running

**Alternatives Considered**:
1. **Browser extensions**: Rejected due to installation friction and permissions
2. **Browser APIs**: Rejected as most don't expose this data programmatically

---

## 5. Plugin System Architecture

### Decision: Isolated JavaScript/TypeScript Plugins with IPC

**Chosen Approach**:
- **Format**: ES modules with exported plugin object
- **API**: Plugin SDK with hooks: `onSearch()`, `onActivate()`, `onInstall()`, `onUninstall()`
- **Sandboxing**: Web Worker or iframe with limited API surface
- **Permissions**: Manifest-declared capabilities (clipboard, fs, shell, network)

**Plugin Manifest Structure**:
```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: Array<'clipboard' | 'fs' | 'shell' | 'network'>;
  triggers?: string[];  // Keyword triggers for the plugin
  entry: string;  // Path to plugin entry point
}
```

**Rationale**:
- JavaScript/TypeScript keeps barrier to entry low for web developers
- Web Worker isolation prevents plugins from crashing main app
- Manifest-based permissions model similar to browser extensions (familiar pattern)

**Alternatives Considered**:
1. **WASM plugins**: Rejected due to complexity and limited ecosystem
2. **Node.js plugins**: Rejected due to security risks (require() gives full system access)
3. **Remote plugins (URL-based)**: Deferred to v2 (security and offline concerns)

---

## 6. Search Architecture

### Decision: Multi-Source Aggregation with Relevance Scoring

**Chosen Approach**:
- **Fuzzy matching**: fuse.js for typo-tolerant search
- **Multi-source**: Query apps, files, clipboard, plugins in parallel
- **Ranking**: Combine relevance scores from:
  - Text match score (fuse.js)
  - Frequency boost (recently used items)
  - Type priority (apps > clipboard > files > plugins)
  - User customizations

**Search Pipeline**:
```
User Input → Debounce 150ms
           → Dispatch to all sources (parallel)
           → Collect results with metadata
           –> Apply ranking algorithm
           → Return top 10 results
```

**Rationale**:
- fuse.js provides excellent fuzzy matching with minimal configuration
- Parallel queries maintain <200ms response requirement
- Multi-factor ranking provides intuitive results

**Alternatives Considered**:
1. **Elasticsearch**: Rejected due to heavyweight infrastructure for local app
2. **Single unified index**: Rejected because data sources have different update patterns

---

## 7. Quick Actions (Calculator, Conversions)

### Decision: Frontend Pattern Matching + Evaluation

**Chosen Approach**:
- **Calculator**: Detect math expressions (`123 * 456`), use `eval()` with strict validation
- **Color conversion**: Regex match hex patterns, convert using utility functions
- **Timestamp**: Detect Unix timestamps, format with `date-fns`
- **Unit conversion**: Match patterns like `100km to miles`, use conversion library

**Implementation**:
```typescript
// Pattern-based action detection
const patterns = [
  { regex: /^\d+[\s+\-*/]\d+/, action: 'calculate' },
  { regex: /^#[0-9a-f]{6}$/i, action: 'colorConvert' },
  { regex: /^\d{10,13}$/, action: 'timestampConvert' },
  { regex: /^(\d+)(km|mile|kg|lb)(\s+to\s+)(km|mile|kg|lb)$/i, action: 'unitConvert' }
];
```

**Rationale**:
- Pattern matching is fast and deterministic
- Frontend evaluation keeps backend simple
- Easy to extend with new patterns

**Alternatives Considered**:
1. **Backend evaluation**: Rejected due to IPC overhead for simple operations
2. **External library (math.js)**: Rejected to minimize dependencies

---

## 8. Window Management & Global Hotkeys

### Decision: Tauri Global Shortcut + Always-On-Top Window

**Chosen Approach**:
- **Hotkey**: `tauri-plugin-global-shortcut` for cross-platform global hotkey registration
- **Window behavior**:
  - Always on top when visible
  - Hide to tray when dismissed
  - Remember position and size
  - Skip taskbar (background process)

**Configuration**:
```typescript
// tauri.conf.json
{
  "windows": [{
    "label": "main",
    "alwaysOnTop": true,
    "skipTaskbar": true,
    "visible": false,
    "decorations": false,
    "center": true
  }]
}
```

**Rationale**:
- Tauri plugin provides mature, tested cross-platform hotkey support
- Hidden-by-default with tray icon maintains low footprint
- Always-on-top ensures visibility when invoked

**Alternatives Considered**:
1. **System tray only**: Rejected as keyboard-driven workflow is primary
2. **Menu bar app (macOS only)**: Rejected for cross-platform parity

---

## 9. Data Storage Architecture

### Decision: SQLite + JSON Files

**Chosen Approach**:
- **File index**: SQLite `files_index.db`
- **Browser cache**: SQLite `browser_cache.db`
- **Clipboard history**: JSON files (rotating, max 100MB total)
- **User preferences**: JSON `preferences.json`
- **Plugin registry**: JSON `plugins/installed.json`

**Rationale**:
- SQLite for query-heavy data (indexing, browser cache)
- JSON for simple key-value data (preferences, manifests)
- File-based clipboard history enables easy size management

**Storage Locations**:
| Platform | Data Directory |
|----------|----------------|
| macOS | `~/Library/Application Support/kaka/` |
| Windows | `%APPDATA%/kaka/` |
| Linux | `~/.config/kaka/` |

**Alternatives Considered**:
1. **All SQLite**: Rejected for simplicity—JSON sufficient for small config data
2. **All JSON**: Rejected for poor query performance on large datasets

---

## 10. Testing Strategy

### Decision: Multi-Layer Testing Approach

**Chosen Approach**:
- **Unit tests**: Vitest (frontend), cargo test (Rust backend)
- **Integration tests**: Tauri command tests
- **E2E tests**: Playwright simulating user workflows

**Coverage Targets**:
- Core search: 90%+ coverage
- Plugin system: 80%+ coverage
- Critical paths (app launch, clipboard): 100% coverage

**Rationale**:
- Multi-layer approach catches issues at different levels
- Playwright enables testing full user flows
- Unit tests enable fast iteration during development

**Alternatives Considered**:
1. **Manual testing only**: Rejected due to regression risk
2. **Snapshot testing**: Rejected due to maintenance overhead for UI

---

## 11. Performance Optimization

### Decision: Lazy Loading + Caching

**Chosen Approach**:
- **Lazy load**: Plugins and browser data loaded on-demand
- **In-memory cache**: LRU cache for frequent searches
- **Debouncing**: 150ms debounce on search input
- **Web Worker**: Heavy computation (file indexing) in background

**Caching Strategy**:
```typescript
// Search result caching
const searchCache = new LRUCache<string, SearchResult[]>({ max: 100 });

// Browser data cache (refresh every 5 min)
const browserCacheExpiry = 5 * 60 * 1000;
```

**Rationale**:
- Lazy loading reduces initial memory footprint
- Caching eliminates redundant work for repeated queries
- Web Workers prevent UI blocking during expensive operations

**Alternatives Considered**:
1. **Preload everything**: Rejected due to memory and startup time impact
2. **No caching**: Rejected due to performance requirements

---

## 12. Security & Privacy

### Decision: Local-First + Permission Model

**Chosen Approach**:
- **All data stored locally**: No telemetry or cloud sync (v1)
- **Plugin permissions**: Explicit opt-in for sensitive operations
- **Clipboard exclusion**: Configurable blacklist for password managers
- **Sandbox escape detection**: Warn user if plugin attempts unauthorized access

**Security Measures**:
- Plugin code runs in Web Worker with restricted APIs
- Clipboard entries from known password managers auto-expire in 2 minutes
- No native code execution in plugins
- All file system access via Tauri commands (not direct Node access)

**Rationale**:
- Local-first aligns with privacy expectations for launcher apps
- Permission model balances extensibility with security
- Sandboxing prevents compromised plugins from affecting the system

**Alternatives Considered**:
1. **Full system access for plugins**: Rejected as security risk
2. **Code signing for plugins**: Deferred to v2 (friction for community plugins)

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **App Discovery** | Platform-specific native APIs | Most reliable, complete metadata |
| **Clipboard** | Polling with native APIs | Cross-platform compatible, efficient |
| **File Index** | SQLite + FS watchers | Fast queries, real-time updates |
| **Browser Data** | Direct SQLite read | Fast, reliable, no browser extension needed |
| **Plugins** | JS/TS in Web Worker sandbox | Low barrier, secure isolation |
| **Search** | fuse.js + multi-factor ranking | Fuzzy matching, intuitive results |
| **Quick Actions** | Frontend pattern matching | Fast, extensible |
| **Storage** | SQLite + JSON hybrid | Right tool for each data type |

---

**Status**: ✅ Phase 0 Complete
**Next Phase**: Phase 1 - Data Model & API Contracts
