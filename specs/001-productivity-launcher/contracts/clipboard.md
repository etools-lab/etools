# API Contract: Clipboard Management

**Subsystem**: Clipboard History
**Version**: 1.0.0
**Status**: Draft

---

## Overview

This contract defines the Tauri commands for monitoring clipboard changes and managing clipboard history.

---

## Commands

### `get_clipboard_history`

Returns clipboard history items, optionally filtered by search query.

**Request**:
```typescript
interface GetClipboardHistoryRequest {
  limit?: number;   // Max items to return (default: 50)
  offset?: number;  // Pagination offset (default: 0)
  search?: string;  // Filter by content (optional)
  type?: 'text' | 'image' | 'all';  // Filter by type (default: 'all')
}
```

**Response**:
```typescript
interface ClipboardItem {
  id: string;           // Unique ID (UUID)
  content: string;      // Text content or base64 image
  contentType: 'text' | 'image' | 'html';
  timestamp: number;    // Unix timestamp (ms)
  sourceApp?: string;   // Application that copied
  size: number;         // Content size in bytes
  expiresAt?: number;   // Auto-expiration time
}

interface GetClipboardHistoryResponse {
  items: ClipboardItem[];
  total: number;        // Total matching items
  hasMore: boolean;     // Whether more items exist
}
```

---

### `get_clipboard_item`

Retrieves a single clipboard item by ID.

**Request**:
```typescript
interface GetClipboardItemRequest {
  id: string;  // Clipboard item ID
}
```

**Response**:
```typescript
interface GetClipboardItemResponse {
  item: ClipboardItem | null;
}
```

**Errors**:
- `ITEM_NOT_FOUND`: Clipboard item does not exist or has expired

---

### `paste_clipboard_item`

Puts a clipboard item back into the system clipboard.

**Request**:
```typescript
interface PasteClipboardItemRequest {
  id: string;  // Clipboard item ID
}
```

**Response**:
```typescript
interface PasteClipboardItemResponse {
  success: boolean;
}
```

**Errors**:
- `ITEM_NOT_FOUND`: Clipboard item does not exist or has expired
- `PASTE_FAILED`: System rejected clipboard write

---

### `delete_clipboard_item`

Deletes a clipboard item from history.

**Request**:
```typescript
interface DeleteClipboardItemRequest {
  id: string;  // Clipboard item ID
}
```

**Response**:
```typescript
interface DeleteClipboardItemResponse {
  success: boolean;
}
```

---

### `clear_clipboard_history`

Clears all clipboard history.

**Request**:
```typescript
interface ClearClipboardHistoryRequest {
  beforeTimestamp?: number;  // Only clear items before this time
}
```

**Response**:
```typescript
interface ClearClipboardHistoryResponse {
  deletedCount: number;
}
```

---

### `get_clipboard_settings`

Returns current clipboard settings.

**Request**:
```typescript
// No parameters
```

**Response**:
```typescript
interface ClipboardSettings {
  enabled: boolean;
  maxItems: number;
  maxSize: number;           // Max size per item in bytes
  retentionDays: number;
  excludedApps: string[];    // Apps to exclude from capture
  sensitiveTimeout: number;  // Auto-expire time for sensitive items (seconds)
}

interface GetClipboardSettingsResponse {
  settings: ClipboardSettings;
}
```

---

### `set_clipboard_settings`

Updates clipboard settings.

**Request**:
```typescript
interface SetClipboardSettingsRequest {
  enabled?: boolean;
  maxItems?: number;
  maxSize?: number;
  retentionDays?: number;
  excludedApps?: string[];
  sensitiveTimeout?: number;
}
```

**Response**:
```typescript
interface SetClipboardSettingsResponse {
  settings: ClipboardSettings;
}
```

---

## Events

### `clipboard:new_item`

Emitted when a new clipboard item is captured.

**Event Data**:
```typescript
interface ClipboardNewItemEvent {
  item: ClipboardItem;
}
```

---

## Implementation Notes

### Clipboard Monitoring Strategy

- **Polling Interval**: 500ms (balance between responsiveness and CPU usage)
- **Deduplication**: Use SHA-256 hash of content to detect duplicates
- **Size Limits**: Reject items > 10MB to prevent disk space issues
- **Excluded Apps**: Default exclude known password managers:
  - macOS: 1Password, Bitwarden, Keeper
  - Windows: 1Password, Bitwarden, LastPass, KeePass
  - Linux: Bitwarden, KeePassXC

### Storage Strategy

- **File Rotation**: One JSON file per day (max 365 days)
- **Cleanup**: Delete files older than retention period on startup
- **Size Management**: If total size > 100MB, delete oldest items

### Sensitive Data Handling

```typescript
// Detect sensitive content patterns
const SENSITIVE_PATTERNS = [
  /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/,  // Credit card
  /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/,            // SSN
  /password/i                                  // Password fields
];

// Apply shorter retention for sensitive items
if (matchesSensitivePattern(content)) {
  expiresAt = Date.now() + (settings.sensitiveTimeout * 1000);
}
```

---

## Performance Requirements

| Operation | Target Latency | Notes |
|-----------|----------------|-------|
| get_clipboard_history | <100ms | For 1000 items |
| paste_clipboard_item | <50ms | System clipboard write |
| Clipboard poll | <10ms | Per poll cycle |

---

## Security Considerations

1. **Permission Required**: Plugin access requires `clipboard:read` or `clipboard:write`
2. **Content Sanitization**: Remove potential XSS from HTML clipboard content
3. **Encryption**: Consider encrypting clipboard history at rest (future enhancement)
