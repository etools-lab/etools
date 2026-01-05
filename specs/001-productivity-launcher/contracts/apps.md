# API Contract: Application Discovery & Launch

**Subsystem**: Application Management
**Version**: 1.0.0
**Status**: Draft

---

## Overview

This contract defines the Tauri commands for discovering installed applications and launching them. All commands are invoked from the frontend via Tauri's IPC mechanism.

---

## Commands

### `get_installed_apps`

Returns a list of all installed applications on the system.

**Request**:
```typescript
interface GetInstalledAppsRequest {
  refresh?: boolean;  // Force re-scan (default: false)
}
```

**Response**:
```typescript
interface ApplicationEntry {
  id: string;              // Unique ID (hash of path)
  name: string;            // Display name
  executablePath: string;  // Absolute path to executable
  icon?: string;           // Icon data URI
  usageCount: number;      // Launch frequency
  lastLaunched?: number;   // Last launch timestamp
  platform: 'macos' | 'windows' | 'linux';
}

interface GetInstalledAppsResponse {
  apps: ApplicationEntry[];
  scanTime: number;  // Time taken to scan (ms)
}
```

**Errors**:
- `SCAN_FAILED`: Platform-specific scan error
- `PERMISSION_DENIED`: Insufficient permissions to read application directories

---

### `launch_app`

Launches an application by its executable path.

**Request**:
```typescript
interface LaunchAppRequest {
  path: string;  // Absolute path to executable
}
```

**Response**:
```typescript
interface LaunchAppResponse {
  success: boolean;
  pid?: number;  // Process ID (if available)
}
```

**Errors**:
- `APP_NOT_FOUND`: Executable path does not exist
- `LAUNCH_FAILED`: OS failed to launch the application
- `PERMISSION_DENIED`: User denied launch permission

**Side Effects**:
- Increments `usageCount` for the application
- Updates `lastLaunched` timestamp

---

### `get_app_icon`

Retrieves the icon for an application.

**Request**:
```typescript
interface GetAppIconRequest {
  path: string;  // Absolute path to application
  size?: number; // Icon size in pixels (default: 64)
}
```

**Response**:
```typescript
interface GetAppIconResponse {
  icon: string;  // Icon as base64 data URI
  format: 'png' | 'icns' | 'ico';
}
```

**Errors**:
- `ICON_NOT_FOUND`: Application has no icon
- `EXTRACT_FAILED`: Failed to extract icon from bundle

---

### `track_app_usage`

Records application launch for analytics and ranking.

**Request**:
```typescript
interface TrackAppUsageRequest {
  appId: string;  // Application ID
}
```

**Response**:
```typescript
interface TrackAppUsageResponse {
  success: boolean;
  usageCount: number;  // Updated count
}
```

---

## Platform-Specific Implementation Notes

### macOS

- Scan `/Applications/` and `~/Applications/` directories
- Parse `.app` bundles: read `Contents/Info.plist` for metadata
- Extract icons from `.icns` files within bundle
- Launch via `open` command or `NSWorkspace` API

### Windows

- Query registry: `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
- Scan start menu: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\`
- Parse `.lnk` files for executable paths
- Launch via `ShellExecute` or `CreateProcess`

### Linux

- Scan XDG data directories: `/usr/share/applications/`, `~/.local/share/applications/`
- Parse `.desktop` files: extract `Exec`, `Name`, `Icon` fields
- Launch via `xdg-open` or execute `Exec` command

---

## Performance Requirements

| Operation | Target Latency | Notes |
|-----------|----------------|-------|
| get_installed_apps (cached) | <50ms | Subsequent calls |
| get_installed_apps (refresh) | <2s | Initial scan |
| launch_app | <500ms | OS-dependent |
| get_app_icon | <100ms | With caching |

---

## Security Considerations

1. **Path Validation**: All paths must be validated to prevent directory traversal
2. **Permission Checks**: Verify executable is actually an application (not arbitrary binary)
3. **Sandboxing**: Plugin access to `launch_app` requires `shell:execute` permission
