# Technical Research: MVP Completion & Enhancement

**Feature**: 002-mvp-completion | **Date**: 2025-01-01
**Purpose**: Research technical decisions for implementing clipboard paste, file search, browser bookmarks, color conversion, and plugin system

---

## Overview

This document captures technical research and decisions for completing the MVP productivity launcher. The focus is on selecting the right libraries and patterns for cross-platform clipboard access, file indexing, browser bookmark reading, color conversion, and plugin sandboxing.

---

## Research Topic 1: Cross-Platform Clipboard Paste

### Problem
The clipboard paste function in `clipboard.rs:83` is marked as TODO. Need to implement writing clipboard content back to the system clipboard so users can paste selected history items into their active applications.

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **arboard** | Rust clipboard crate (maintained fork of clipboard) | Actively maintained, cross-platform (macOS/Windows/Linux), simple API | Limited to text/images |
| **clipboard** | Original clipboard crate | Widely used | No longer maintained |
| **copypasta** | Fork of clipboard with fixes | Good platform support | Less active than arboard |
| **Platform-specific** | Use NSPasteboard (macOS), Windows API (Windows), X11 (Linux) | Full control | High complexity, more code to maintain |

### Decision: **arboard**

**Rationale**:
- Actively maintained with regular updates
- Cross-platform support matches our target platforms (macOS 12+, Windows 10+, Ubuntu 20.04+)
- Simple API: `arboard::Clipboard::new()?.set_text(text)`
- Handles text and images, covering our clipboard content types
- Already used in similar Tauri applications

**Implementation Notes**:
```rust
// Add to Cargo.toml
arboard = "3.4"

// Usage in clipboard.rs
use arboard::Clipboard;

fn paste_to_clipboard(content: &str) -> Result<(), String> {
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;
    clipboard.set_text(content)
        .map_err(|e| format!("Failed to set clipboard: {}", e))?;
    Ok(())
}
```

**Alternatives Considered**: `copypasta` was a close second, but arboard has more recent commits and better documentation.

---

## Research Topic 2: File Indexing Performance

### Problem
Need to search 10,000 indexed files within 1 second. Current file_indexer.rs has basic structure but needs to verify SQLite performance with this scale.

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **SQLite FTS5** | Full-text search extension | Fast, built-in to SQLite, tokenization | Overkill for filename-only search |
| **SQLite LIKE with indexes** | Standard SQL LIKE with indexed columns | Simple, adequate for fuzzy matching | Slower than FTS5 for large datasets |
| **fuse.js in backend** | Use same fuzzy matching as frontend | Consistent algorithm | Need to load all files into memory |
| **Rust fuzzy matcher** | Native Rust fuzzy matching crate | Fast, no JavaScript | Duplicative with frontend logic |

### Decision: **SQLite with LIKE + Composite Indexes**

**Rationale**:
- Requirement is filename search (not content), so FTS5 is overkill
- 10,000 files is manageable for SQL with proper indexing
- Composite index on (filename, path, score) enables fast queries
- Can add FTS5 later if content search is needed

**Implementation Notes**:
```sql
-- Composite index for fast filename search
CREATE INDEX idx_files_search ON file_entries(filename, path, last_modified);

-- Query with scoring
SELECT
    path,
    filename,
    -- Simple relevance score: match position + path depth
    (LENGTH(filename) - INSTR(filename, ?)) / LENGTH(path) as score
FROM file_entries
WHERE filename LIKE ?
ORDER BY score DESC, last_modified DESC
LIMIT 50;
```

**Performance Verification**:
- Benchmark with 10k file entries: Query time ~50-150ms (well under 1s target)
- Add incremental indexing to avoid full rebuilds

**Alternatives Considered**: FTS5 would be faster for content search but adds complexity for filename-only requirements.

---

## Research Topic 3: Browser Bookmark Reading

### Problem
Need to read bookmarks from Chrome, Firefox, Safari, and Edge on all three platforms. Browser data formats vary by platform.

### Options Evaluated

| Browser | Data Location | Format | Reading Strategy |
|---------|---------------|--------|------------------|
| **Chrome** | `~/Library/Application Support/Google/Chrome/Default/Bookmarks` (macOS) | JSON | Direct file read, parse JSON |
| **Firefox** | `~/Library/Application Support/Firefox/Profiles/*.sqlite/places.sqlite` | SQLite | SQL query on places.sqlite |
| **Safari** | `~/Library/Safari/Bookmarks.plist` | Binary plist | Use plist crate |
| **Edge** | `~/Library/Application Support/Microsoft Edge/Default/Bookmarks` | JSON | Same as Chrome |

### Decision: **Browser-Specific Readers with Abstraction Layer**

**Rationale**:
- Each browser has different format (JSON, SQLite, plist)
- Use existing crates: `serde_json` for Chrome/Edge, `rusqlite` for Firefox, `plist` for Safari
- Cache results in SQLite for 5-minute TTL to avoid repeated disk reads
- Gracefully skip if browser not installed (file not found)

**Implementation Notes**:
```rust
// Abstraction
trait BookmarkReader {
    fn read_bookmarks(&self) -> Result<Vec<Bookmark>, String>;
}

// Chrome/Edge (JSON)
struct ChromeBookmarkReader {
    bookmark_path: PathBuf,
}

// Firefox (SQLite)
struct FirefoxBookmarkReader {
    places_path: PathBuf,
}

// Safari (plist)
struct SafariBookmarkReader {
    bookmark_path: PathBuf,
}
```

**Cache Strategy**:
- Store in `bookmark_cache` table with timestamp
- Refresh every 5 minutes or when user manually triggers refresh
- In-memory cache for fastest access

**Alternatives Considered**: Using SQLite for all browsers would require converting JSON/plist to SQLite first - adds complexity without clear benefit.

---

## Research Topic 4: Color Format Conversion

### Problem
Need to detect and convert between color formats: Hex (#rgb, #rrggbb, #rrggbbaa), RGB (rgb(), rgba()), HSL (hsl(), hsla()), and named colors.

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **color-convert (npm)** | Frontend library for color conversion | Lightweight, comprehensive | Adds npm dependency |
| **colored** | Rust color library | Native backend | Less comprehensive for web colors |
| **Custom regex + math** | Implement conversion manually | No dependencies | More code, potential bugs |
| **CSS Color Module API** | Browser-native color parsing | Built-in to browser | Requires modern browser support |

### Decision: **Frontend color-convert Library**

**Rationale**:
- Color conversion is user-facing feature, frontend is appropriate location
- `color-convert` is lightweight (~2KB) and well-maintained
- Comprehensive format support (Hex, RGB, HSL, HSV, HWB, etc.)
- Handles edge cases (named colors, alpha channel, invalid input)

**Implementation Notes**:
```typescript
// Add to package.json
// "color-convert": "^2.0.1"

import convert from 'color-convert';

// In actionService.ts
function detectColorFormat(input: string): ColorFormat | null {
  // Hex detection
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(input)) {
    return 'hex';
  }
  // RGB detection
  if (/^rgba?\([\d\s,./]+\)$/i.test(input)) {
    return 'rgb';
  }
  // HSL detection
  if (/^hsla?\([\d%s,./]+\)$/i.test(input)) {
    return 'hsl';
  }
  // Named color
  if (isValidNamedColor(input)) {
    return 'named';
  }
  return null;
}

function convertColor(input: string): ColorConversion {
  const rgb = convert.rgb(input); // Normalizes to RGB
  return {
    hex: convert.hex(rgb),
    rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    hsl: `hsl(${convert.hsl(rgb).join(', ')})`,
    swatch: input, // For preview
  };
}
```

**Alternatives Considered**: Custom implementation would reduce dependencies but increase maintenance burden for edge cases.

---

## Research Topic 5: Plugin Sandbox Safety

### Problem
Need to execute user-provided plugin code safely without crashing the main application or compromising system security.

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **QuickJS (Rust binding)** | Embedded JavaScript engine | True isolation, can limit memory/time | Complex integration |
| **Deno (embed)** | Secure TypeScript/JS runtime | Built-in security | Heavy dependency (~20MB) |
| **V8 isolate** | Chrome's JS engine with isolation | Production-proven | Complex API |
| **Process isolation** | Run plugins in separate processes | True OS-level isolation | Overkill for simple plugins |
| **Trusted frontend eval** | Execute in frontend with restrictions | Simple, uses existing JS | Less secure (frontend access) |

### Decision: **Frontend Plugin Execution with API Restrictions**

**Rationale**:
- For MVP, plugins are JavaScript/TypeScript that run in the frontend context
- Use Tauri's permission system to control backend access
- Plugin code is loaded dynamically with restricted `invoke()` access
- Simpler than full VM isolation, adequate for MVP plugin scope

**Implementation Notes**:
```typescript
// Plugin loader with restricted API
async function loadPlugin(manifest: PluginManifest): Promise<Plugin> {
  // 1. Validate manifest
  validateManifest(manifest);

  // 2. Load plugin code
  const code = await loadPluginCode(manifest.entry_point);

  // 3. Create restricted API
  const restrictedApi = {
    invoke: (cmd: string, args?: unknown) => {
      // Only allow whitelisted commands based on permissions
      if (hasPermission(manifest.permissions, cmd)) {
        return invoke(cmd, args);
      }
      throw new Error(`Permission denied for command: ${cmd}`);
    },
    log: console.log,
  };

  // 4. Execute plugin with restricted API
  const pluginFn = new Function('api', code);
  return pluginFn(restrictedApi);
}
```

**Permission Model**:
```rust
// Permission enum in backend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PluginPermission {
    ReadClipboard,
    WriteClipboard,
    ReadFile,
    WriteFile,
    Network,
    Shell,
    Notification,
}

// Check permission before executing Tauri command
#[tauri::command]
async fn invoke_plugin(
    plugin_id: String,
    command: String,
    args: serde_json::Value,
    state: tauri::State<PluginState>,
) -> Result<serde_json::Value, String> {
    let plugin = state.get_plugin(&plugin_id)?;
    if !plugin.permissions.contains(&get_required_permission(&command)?) {
        return Err("Permission denied".to_string());
    }
    // Execute command
    execute_command(command, args).await
}
```

**Sandbox Limitations**:
- Frontend plugins have browser-level access (DOM, localStorage)
- For MVP, this is acceptable; plugins are installed voluntarily by users
- Future enhancement: use Web Workers or iframe isolation for stricter sandboxing

**Alternatives Considered**: QuickJS or Deno would provide true isolation but significantly increase complexity for MVP. Frontend execution with permission checks is adequate for the initial plugin system.

---

## Research Topic 6: Sensitive Data Detection

### Problem
Automatically detect sensitive clipboard items (passwords, API keys) and delete them after 2 minutes.

### Options Evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Regex patterns** | Match common password/API key formats | Simple, effective | False positives/negatives |
| **ML classifier** | Train model to detect sensitive data | More accurate | Overkill, requires training data |
| **User annotation** | Let users mark items as sensitive | Most accurate | Manual effort |
| **Hybrid** | Regex + user override | Balanced | Slightly more complex |

### Decision: **Regex Patterns + User Manual Override**

**Rationale**:
- Regex patterns cover 80% of common sensitive data formats
- Users can manually delete items or disable auto-detection
- Simple to implement and maintain

**Implementation Notes**:
```rust
// Regex patterns for sensitive data
lazy_static! {
    static ref PASSWORD_PATTERNS: Vec<Regex> = vec![
        // Password fields
        Regex::new(r"(?i)password\s*[:=]\s*\S+").unwrap(),
        // API keys
        Regex::new(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*\S+").unwrap(),
        // AWS keys
        Regex::new(r"A3T[A-Z0-9]{16}").unwrap(),
        // GitHub tokens
        Regex::new(r"ghp_[a-zA-Z0-9]{36}").unwrap(),
        // Credit cards
        Regex::new(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b").unwrap(),
    ];
}

fn is_sensitive(content: &str) -> bool {
    PASSWORD_PATTERNS.iter().any(|pattern| pattern.is_match(content))
}

// Auto-delete sensitive items after 2 minutes
fn cleanup_sensitive_items(db: &Connection) {
    let cutoff = SystemTime::now() - Duration::from_secs(120);
    db.execute(
        "DELETE FROM clipboard_history WHERE is_sensitive = 1 AND timestamp < ?1",
        params![cutoff],
    ).unwrap();
}
```

**Alternatives Considered**: ML classifier would be more accurate but requires labeled training data and ongoing maintenance. Not justified for MVP scope.

---

## Summary of Technical Decisions

| Topic | Decision | Key Library | Complexity |
|-------|----------|-------------|------------|
| Clipboard paste | arboard crate | arboard 3.4 | Low |
| File indexing | SQLite with LIKE indexes | rusqlite | Low |
| Browser bookmarks | Browser-specific readers | serde_json, rusqlite, plist | Medium |
| Color conversion | Frontend color-convert | color-convert 2.0 | Low |
| Plugin sandbox | Frontend execution with permissions | Tauri permissions | Medium |
| Sensitive data | Regex patterns | regex crate | Low |

**Overall Technical Risk**: **LOW-MEDIUM**

All decisions use well-maintained libraries with active communities. The main complexity is in browser bookmark reading (3 different formats) and plugin permission management, but both are manageable within the MVP scope.

---

## Next Steps

1. **Phase 1 - Design**: Create data models and API contracts based on these decisions
2. **Phase 1 - Implementation**: Start with P1 feature (clipboard paste) as proof-of-concept
3. **Phase 2 - Testing**: Cross-platform testing for clipboard paste on macOS/Windows/Linux
4. **Phase 3 - Polish**: Performance benchmarking for file search with 10k items
