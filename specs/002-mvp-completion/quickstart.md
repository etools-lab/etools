# Developer Quickstart: MVP Completion & Enhancement

**Feature**: 002-mvp-completion | **Date**: 2025-01-01
**Purpose**: Get up and running with implementing clipboard paste, file search, browser bookmarks, color conversion, and plugins

---

## Prerequisites

- **Rust**: 1.75+ (`rustc --version`)
- **Node.js**: 18+ (`node --version`)
- **pnpm** or **npm** (`pnpm --version`)
- **Tauri CLI**: `npm install -g @tauri-apps/cli`
- **Platform**: macOS 12+, Windows 10+, or Ubuntu 20.04+

---

## Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Or with npm
npm install
```

### 2. Add New Dependencies

```bash
# Frontend: color conversion library
pnpm add color-convert

# Backend: cross-platform clipboard (add to src-tauri/Cargo.toml)
# Edit src-tauri/Cargo.toml and add:
# arboard = "3.4"
```

### 3. Update Cargo.toml

Edit `src-tauri/Cargo.toml`:

```toml
[dependencies]
arboard = "3.4"           # For clipboard paste
# ... existing dependencies
```

Then run:

```bash
cd src-tauri
cargo fetch
cd ..
```

---

## Project Structure

```
kaka/
├── src/                          # Frontend (TypeScript/React)
│   ├── components/
│   │   ├── SearchWindow.tsx      # Main search UI
│   │   ├── ClipboardResultItem.tsx   # NEW: Clipboard display
│   │   ├── FileResultItem.tsx    # NEW: File search results
│   │   ├── BrowserResultItem.tsx     # NEW: Bookmark results
│   │   └── ColorResultItem.tsx   # NEW: Color conversion results
│   ├── services/
│   │   ├── actionService.ts      # MODIFY: Add color conversion
│   │   └── pluginLoader.ts       # NEW: Plugin loader
│   └── types/
│       ├── clipboard.ts          # NEW: Clipboard types
│       └── plugin.ts             # NEW: Plugin types
│
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── cmds/
│   │   │   ├── clipboard.rs      # MODIFY: Fix paste function
│   │   │   ├── search.rs         # MODIFY: Add file/bookmark search
│   │   │   └── plugins.rs        # MODIFY: Complete TODOs
│   │   ├── services/
│   │   │   ├── file_indexer.rs   # MODIFY: Complete indexing
│   │   │   └── browser_reader.rs # MODIFY: Complete bookmark reader
│   │   └── db/
│   │       └── clipboard.rs      # MODIFY: Add paste support
│
└── specs/002-mvp-completion/     # This feature's documentation
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md (this file)
    └── contracts/
        ├── clipboard.md
        ├── search.md
        ├── plugins.md
        └── actions.md
```

---

## Development Workflow

### Start Development Server

```bash
# Terminal 1: Frontend dev server
pnpm dev

# Terminal 2: Tauri dev (includes Rust backend)
pnpm tauri dev
```

The app will open in a new window. Press `Option+Space` (macOS) or `Alt+Space` (Windows/Linux) to open the search window.

### Run Tests

```bash
# Frontend unit tests
pnpm test

# Backend tests
cd src-tauri
cargo test

# E2E tests (requires app to be running)
pnpm test:e2e
```

---

## Implementation Order

### Phase 1: Clipboard Paste (P1 - Critical)

**Why First**: Fixes broken functionality, highest user value

**Files to Modify**:
1. `src-tauri/src/cmds/clipboard.rs` - Implement `paste_clipboard_item()` using arboard
2. `src/components/ClipboardResultItem.tsx` - Update UI to handle paste action

**Steps**:
```bash
# 1. Edit clipboard.rs
# - Add: use arboard::Clipboard;
# - Implement paste function:
#   pub fn paste_to_clipboard(content: &str) -> Result<(), String>

# 2. Test with existing clipboard history
# - Copy some text
# - Search with "clip:"
# - Press Enter on result
# - Paste in another app to verify
```

**Acceptance**: Paste works across all three platforms (test on macOS/Windows/Linux)

---

### Phase 2: File Search (P2 - High Value)

**Why Second**: Documented feature, just needs enablement

**Files to Modify**:
1. `src-tauri/src/services/file_indexer.rs` - Complete indexing logic
2. `src-tauri/src/cmds/search.rs` - Implement `search_files()` command
3. `src/components/FileResultItem.tsx` - Display file results

**Steps**:
```bash
# 1. Edit file_indexer.rs
# - Implement walk_directory() to recursively scan paths
# - Add upsert_file_entry() to add/update files in DB
# - Exclude node_modules, .git, target, etc.

# 2. Edit search.rs
# - Implement search_files() using SQL LIKE query
# - Add ranking by path depth and relevance

# 3. Update settings panel
# - Add toggle for "Enable File Search"
# - Add path picker for indexed directories

# 4. Test
# - Create test files in ~/Documents
# - Enable file search in settings
# - Trigger index_files() command
# - Search for file names
```

**Acceptance**: Can find file within 1 second for 10k indexed files

---

### Phase 3: Browser Bookmarks (P2 - High Value)

**Why Third**: Similar to file search, incremental complexity

**Files to Modify**:
1. `src-tauri/src/services/browser_reader.rs` - Complete Chrome/Firefox/Safari readers
2. `src-tauri/src/cmds/search.rs` - Implement `search_browser_data()` command
3. `src/components/BrowserResultItem.tsx` - Display bookmark results

**Steps**:
```bash
# 1. Edit browser_reader.rs
# - Implement ChromeBookmarkReader (JSON parsing)
# - Implement FirefoxBookmarkReader (SQLite query)
# - Implement SafariBookmarkReader (plist parsing)

# 2. Edit search.rs
# - Add update_browser_cache() command
# - Implement search_browser_data() with cache TTL check

# 3. Update settings panel
# - Add toggles for each browser source
# - Add "Refresh Bookmarks" button

# 4. Test
# - Ensure Chrome/Firefox/Safari have bookmarks
# - Enable browser search in settings
# - Search for bookmark titles
```

**Acceptance**: Bookmark search results appear within 200ms

---

### Phase 4: Color Conversion (P3 - Convenience)

**Why Fourth**: New feature, simpler implementation

**Files to Modify**:
1. `src/services/actionService.ts` - Add color detection and conversion
2. `src/components/ColorResultItem.tsx` - Display color conversions

**Steps**:
```bash
# 1. Add dependency
# pnpm add color-convert

# 2. Edit actionService.ts
# - Add isColorInput() with regex patterns
# - Add convertColor() using color-convert library
# - Integrate with detectAction()

# 3. Create ColorResultItem.tsx
# - Display color swatch
# - Show Hex, RGB, HSL formats
# - Add copy buttons

# 4. Test
# - Type "#ff0000" in search
# - Verify all formats displayed
# - Click copy button
```

**Acceptance**: Can convert between Hex, RGB, HSL formats correctly

---

### Phase 5: Plugin System (P3 - Foundation)

**Why Last**: Most complex, builds on all other features

**Files to Modify**:
1. `src-tauri/src/cmds/plugins.rs` - Complete all TODO functions
2. `src/services/pluginLoader.ts` - Create plugin loader
3. `src/components/PluginResultItem.tsx` - Display plugin results

**Steps**:
```bash
# 1. Edit plugins.rs (backend)
# - Complete install_plugin() with manifest validation
# - Implement enable_plugin(), disable_plugin()
# - Add permission checking logic
# - Complete set_plugin_setting(), get_plugin_setting()

# 2. Create pluginLoader.ts (frontend)
# - Load plugin code from file system
# - Create restricted API with permission checks
# - Execute plugin entry point

# 3. Create sample plugin
# - mkdir -p ~/.config/kaka/plugins/hello-world
# - Create plugin.json manifest
# - Create index.ts with execute() function

# 4. Test
# - Install sample plugin
# - Type plugin trigger keyword
# - Verify plugin executes
```

**Acceptance**: Can load and execute at least one working plugin

---

## Key Implementation Notes

### Clipboard Paste (arboard)

```rust
// src-tauri/src/cmds/clipboard.rs

use arboard::Clipboard;

#[tauri::command]
pub async fn paste_clipboard_item(id: String) -> Result<(), String> {
    // 1. Get clipboard item from database
    let item = get_clipboard_item_from_db(id)?;

    // 2. Write to system clipboard
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    match item.content_type {
        ClipboardContentType::Text => {
            clipboard.set_text(item.text.unwrap_or_default())
                .map_err(|e| format!("Failed to set clipboard: {}", e))?;
        }
        // Handle other types...
    }

    Ok(())
}
```

### File Search Ranking

```sql
-- src-tauri/src/db/files.rs (SQL query)

SELECT
    path,
    filename,
    -- Relevance score: match position / path depth
    (LENGTH(filename) - INSTR(LOWER(filename), LOWER(?1))) / (depth + 1) as score
FROM file_entries
WHERE filename LIKE ?1  -- Fuzzy match
ORDER BY score DESC, last_modified DESC
LIMIT ?2;
```

### Color Conversion

```typescript
// src/services/actionService.ts

import convert from 'color-convert';

export function detectColor(query: string): ColorConversion | null {
  const patterns = {
    hex: /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    rgb: /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/i,
    hsl: /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) {
      return convertColor(query);
    }
  }

  return null;
}

function convertColor(input: string): ColorConversion {
  const rgb = convert.rgb(input);  // Convert to RGB first
  return {
    input,
    hex: convert.hex(rgb),
    rgb: `rgb(${rgb.join(', ')})`,
    hsl: `hsl(${convert.hsl(rgb).join(', ')})`,
  };
}
```

### Plugin Permission Check

```typescript
// src/services/pluginLoader.ts

const PERMISSION_MAP: Record<string, PluginPermission> = {
  'get_clipboard_history': 'read_clipboard',
  'paste_clipboard_item': 'write_clipboard',
  'read_file': 'read_file',
  'write_file': 'write_file',
  // ... etc
};

function createRestrictedAPI(permissions: PluginPermission[]): PluginAPI {
  return {
    invoke: async (cmd: string, args?: unknown) => {
      const required = PERMISSION_MAP[cmd];
      if (required && !permissions.includes(required)) {
        throw new Error(`Permission denied: ${cmd} requires ${required}`);
      }
      return invoke(cmd, args);  // Tauri invoke
    },
    log: console.log,
  };
}
```

---

## Testing Strategy

### Unit Tests

```bash
# Frontend
pnpm test src/services/actionService.test.ts
pnpm test src/services/pluginLoader.test.ts

# Backend
cargo test --package tauri cmds::clipboard
cargo test --package tauri services::file_indexer
```

### Integration Tests

```bash
# Test clipboard paste end-to-end
pnpm test:e2e clipboard-paste.spec.ts

# Test file search with real files
pnpm test:e2e file-search.spec.ts

# Test browser bookmark reading
pnpm test:e2e browser-bookmarks.spec.ts
```

### Manual Testing Checklist

- [ ] Copy text, search "clip:", paste works in another app
- [ ] File search finds files in indexed paths
- [ ] Browser bookmarks appear when enabled
- [ ] Color conversion shows all formats correctly
- [ ] Sample plugin executes when trigger typed
- [ ] Settings toggles enable/disable features

---

## Common Issues & Solutions

### Issue: `arboard` compile error on Linux

**Solution**: Install X11 development libraries:
```bash
sudo apt-get install libx11-dev libxtst-dev
```

### Issue: Browser bookmark database locked

**Solution**: Close the browser before indexing bookmarks. Firefox locks places.sqlite when running.

### Issue: File index takes too long

**Solution**: Limit initial index to ~/Documents (not entire filesystem). Use incremental updates.

### Issue: Plugin permission dialog not showing

**Solution**: Ensure Tauri API is enabled and `allowlist` includes plugin commands in `tauri.conf.json`.

---

## Next Steps

After completing all 5 phases:

1. **Run full test suite**: `pnpm test && cd src-tauri && cargo test`
2. **Manual testing**: Test each feature per acceptance criteria
3. **Performance benchmarking**: Verify <1s file search, <200ms bookmark search
4. **Cross-platform testing**: Test on macOS, Windows, Linux if possible
5. **Clean up TODOs**: Remove all TODO comments from implemented code
6. **Update README**: Ensure all documented features work as advertised

---

## Resources

- **Tauri Docs**: https://tauri.app/v1/guides/
- **Rust Book**: https://doc.rust-lang.org/book/
- **React Docs**: https://react.dev/
- **arboard crate**: https://docs.rs/arboard/
- **color-convert**: https://www.npmjs.com/package/color-convert

---

**Need Help?**

- Check the `contracts/` folder for detailed API specifications
- Review `data-model.md` for entity relationships
- See `research.md` for technical decisions and rationale
- Open an issue on GitHub for bugs or questions
