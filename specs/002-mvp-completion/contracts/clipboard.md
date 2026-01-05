# Clipboard API Contract

**Feature**: 002-mvp-completion | **Module**: Clipboard Management
**Purpose**: Tauri commands for clipboard history, paste, and sensitive data management

---

## Overview

The clipboard API provides commands for capturing clipboard content, storing history, searching clipboard items, and pasting selected items back to the system clipboard.

---

## Commands

### 1. `paste_clipboard_item`

Paste a clipboard item back to the system clipboard.

**Location**: `src-tauri/src/cmds/clipboard.rs`

**Signature**:
```rust
#[tauri::command]
pub async fn paste_clipboard_item(
    id: String,
) -> Result<(), String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | String | Yes | UUID of the clipboard item to paste |

**Returns**: `Result<(), String>`
- `Ok(())` - Successfully pasted to system clipboard
- `Err(String)` - Error message (e.g., "Clipboard item not found", "Failed to access system clipboard")

**Error Conditions**:
- Clipboard item with `id` not found → 404 error
- System clipboard access denied → Permission error
- Content too large → Truncation warning

**Examples**:
```typescript
// Frontend invocation
try {
  await invoke('paste_clipboard_item', { id: 'abc-123-def' });
  console.log('Pasted to clipboard');
} catch (error) {
  console.error('Paste failed:', error);
}
```

---

### 2. `get_clipboard_history`

Retrieve clipboard history items, most recent first.

**Signature**:
```rust
#[tauri::command]
pub fn get_clipboard_history(
    limit: Option<usize>,
) -> Result<Vec<ClipboardItem>, String>
```

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `limit` | usize | No | 100 | Maximum number of items to return |

**Returns**: `Result<Vec<ClipboardItem>, String>`

**ClipboardItem Structure**:
```typescript
interface ClipboardItem {
  id: string;
  content_type: 'Text' | 'Image' | 'Html' | 'File';
  text?: string;
  image_path?: string;
  hash: string;
  timestamp: number;  // Unix timestamp in seconds
  is_sensitive: boolean;
  app_source?: string;
}
```

**Error Conditions**:
- Database access failed → Storage error

**Examples**:
```typescript
// Get last 50 clipboard items
const history = await invoke<ClipboardItem[]>('get_clipboard_history', { limit: 50 });
console.log(`Found ${history.length} items`);
```

---

### 3. `search_clipboard`

Search clipboard history by text content.

**Signature**:
```rust
#[tauri::command]
pub fn search_clipboard(
    query: String,
    limit: usize,
) -> Result<Vec<ClipboardItem>, String>
```

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | String | Yes | - | Search query (supports LIKE pattern) |
| `limit` | usize | No | 50 | Maximum results |

**Returns**: `Result<Vec<ClipboardItem>, String>`

**Error Conditions**:
- Invalid query pattern → Validation error
- Database access failed → Storage error

**Examples**:
```typescript
// Search for clipboard items containing "password"
const results = await invoke<ClipboardItem[]>('search_clipboard', {
  query: 'password',
  limit: 20
});
```

---

### 4. `delete_clipboard_item`

Delete a specific clipboard item from history.

**Signature**:
```rust
#[tauri::command]
pub fn delete_clipboard_item(
    id: String,
) -> Result<(), String>
```

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | String | Yes | UUID of item to delete |

**Returns**: `Result<(), String>`

**Error Conditions**:
- Item not found → Silent success (idempotent)

**Examples**:
```typescript
await invoke('delete_clipboard_item', { id: 'abc-123-def' });
```

---

### 5. `clear_clipboard_history`

Delete all clipboard history.

**Signature**:
```rust
#[tauri::command]
pub fn clear_clipboard_history(
) -> Result<(), String>
```

**Returns**: `Result<(), String>`

**Error Conditions**:
- Database deletion failed → Storage error

**Examples**:
```typescript
await invoke('clear_clipboard_history');
```

---

### 6. `get_clipboard_settings`

Get clipboard-related settings.

**Signature**:
```rust
#[tauri::command]
pub fn get_clipboard_settings(
) -> Result<ClipboardSettings, String>
```

**Returns**: `Result<ClipboardSettings, String>`

**ClipboardSettings Structure**:
```typescript
interface ClipboardSettings {
  max_items: number;        // Default: 1000
  retention_days: number;   // Default: 30
  sensitive_retention_minutes: number;  // Default: 2
  enable_image_support: boolean;  // Default: true
}
```

---

### 7. `set_clipboard_settings`

Update clipboard settings.

**Signature**:
```rust
#[tauri::command]
pub fn set_clipboard_settings(
    settings: ClipboardSettings,
) -> Result<(), String>
```

**Parameters**: `ClipboardSettings` object (see above)

---

## Events

### `clipboard:new_item`

Emitted when a new clipboard item is captured.

**Payload**: `ClipboardItem`

**Usage**:
```typescript
const unlisten = await listen<ClipboardItem>('clipboard:new_item', (event) => {
  console.log('New clipboard item:', event.payload);
});
```

---

## Implementation Notes

### Performance Requirements
- `paste_clipboard_item`: <100ms to write to system clipboard
- `get_clipboard_history`: <200ms for 100 items
- `search_clipboard`: <300ms for query

### Security Considerations
- Sensitive items automatically deleted after 2 minutes
- Password/API key detection using regex patterns
- All clipboard data stored locally (no network transmission)

### Platform-Specific Behavior
- **macOS**: Uses NSPasteboard via arboard crate
- **Windows**: Uses Windows clipboard API via arboard
- **Linux**: Uses X11 clipboard via arboard

### Limitations
- Maximum text content: 10MB per item
- Maximum history: 1000 items
- Image support: PNG/JPG only (thumbnails)
