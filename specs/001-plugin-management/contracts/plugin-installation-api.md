# Plugin Installation API Contract

**Date**: 2025-01-03  
**Version**: 1.0.0  
**Purpose**: API contract for plugin installation via drag-and-drop functionality

## Overview

This API contract defines the interface between frontend drag-and-drop functionality and backend plugin installation services. It provides secure file validation, plugin extraction, and installation with proper error handling and progress reporting.

## Commands

### 1. Validate Plugin Package

Validates a plugin package before installation.

**Command**: `plugin_validate_package`

**Parameters**:
```typescript
interface ValidatePluginPackageRequest {
  filePath: string;           // Path to the plugin package file
  source: 'file' | 'url' | 'github-release';
}
```

**Response**:
```typescript
interface ValidatePluginPackageResponse {
  isValid: boolean;
  manifest?: PluginManifest;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}
```

**Error Codes**:
- `INVALID_FILE_FORMAT`: File is not a supported format
- `MISSING_MANIFEST`: plugin.json file is missing
- `INVALID_MANIFEST`: Manifest JSON is malformed
- `REQUIRED_FIELD_MISSING`: Required field is missing
- `INVALID_ID_FORMAT`: Plugin ID format is invalid
- `INVALID_VERSION_FORMAT`: Version format is invalid
- `UNAUTHORIZED_PERMISSION`: Permission not in allowed list

### 2. Extract Plugin Package

Extracts plugin package to temporary directory.

**Command**: `plugin_extract_package`

**Parameters**:
```typescript
interface ExtractPluginPackageRequest {
  filePath: string;
  targetDir?: string;          // Optional target directory
}

interface ExtractProgress {
  stage: 'extracting' | 'validating' | 'complete';
  progress: number;           // 0-100
  currentFile?: string;
}
```

**Response**:
```typescript
interface ExtractPluginPackageResponse {
  success: boolean;
  extractedPath: string;       // Path to extracted directory
  manifest: PluginManifest;
  files: ExtractedFile[];
}

interface ExtractedFile {
  path: string;               // Relative path in package
  size: number;               // File size in bytes
  type: 'file' | 'directory';
}
```

**Error Codes**:
- `EXTRACTION_FAILED`: File extraction failed
- `DISK_SPACE_INSUFFICIENT`: Not enough disk space
- `PERMISSION_DENIED`: Insufficient permissions
- `CORRUPTED_ARCHIVE`: Archive is corrupted

### 3. Install Plugin

Installs plugin from extracted directory.

**Command**: `plugin_install`

**Parameters**:
```typescript
interface InstallPluginRequest {
  extractedPath: string;
  pluginId: string;
  permissions: PluginPermission[];
  autoEnable?: boolean;        // Default: false
}

interface InstallProgress {
  stage: InstallStage;
  progress: number;           // 0-100
  message: string;
}

type InstallStage = 
  | 'validating'
  | 'copying_files'
  | 'registering_plugin'
  | 'verifying_installation'
  | 'updating_database'
  | 'complete';
}
```

**Response**:
```typescript
interface InstallPluginResponse {
  success: boolean;
  plugin: Plugin;
  warnings: InstallWarning[];
}

interface InstallWarning {
  code: string;
  message: string;
  action?: 'warning' | 'fix_applied';
}
```

**Error Codes**:
- `PLUGIN_ALREADY_EXISTS`: Plugin with same ID already exists
- `INSTALLATION_FAILED`: Installation failed
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_FAILED`: Plugin validation failed
- `DATABASE_ERROR`: Database operation failed

### 4. Get Installation Status

Gets current installation status for progress tracking.

**Command**: `plugin_get_install_status`

**Parameters**:
```typescript
interface GetInstallStatusRequest {
  installId: string;          // Installation ID from previous calls
}
```

**Response**:
```typescript
interface GetInstallStatusResponse {
  installId: string;
  stage: InstallStage;
  progress: number;
  message: string;
  error?: string;
  estimatedTimeRemaining?: number; // seconds
}
```

### 5. Cancel Installation

Cancels an ongoing installation.

**Command**: `plugin_cancel_install`

**Parameters**:
```typescript
interface CancelInstallRequest {
  installId: string;
  cleanup?: boolean;           // Default: true
}
```

**Response**:
```typescript
interface CancelInstallResponse {
  success: boolean;
  message: string;
  cleanupRequired: boolean;
}
```

## Event System

### Installation Events

Events are emitted during installation for real-time UI updates.

**Event**: `plugin-install-progress`

```typescript
interface PluginInstallProgressEvent {
  installId: string;
  pluginId: string;
  stage: InstallStage;
  progress: number;
  message: string;
}
```

**Event**: `plugin-install-complete`

```typescript
interface PluginInstallCompleteEvent {
  installId: string;
  plugin: Plugin;
  success: boolean;
  warnings: InstallWarning[];
}
```

**Event**: `plugin-install-error`

```typescript
interface PluginInstallErrorEvent {
  installId: string;
  pluginId?: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

## Frontend Integration

### React Hook for Drag-and-Drop

```typescript
import { invoke } from '@tauri-apps/api/core';

interface UsePluginInstallResult {
  installPlugin: (file: File) => Promise<string>;
  getInstallStatus: (installId: string) => Promise<InstallStatus>;
  cancelInstall: (installId: string) => Promise<void>;
  isInstalling: boolean;
  currentInstallation?: InstallStatus;
}

export const usePluginInstall = (): UsePluginInstallResult => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [currentInstallation, setCurrentInstallation] = useState<InstallStatus>();

  const installPlugin = async (file: File): Promise<string> => {
    setIsInstalling(true);
    
    try {
      // Step 1: Validate package
      const validation = await invoke<ValidatePluginPackageResponse>('plugin_validate_package', {
        filePath: file.path,
        source: 'file'
      });
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      // Step 2: Extract package
      const extraction = await invoke<ExtractPluginPackageResponse>('plugin_extract_package', {
        filePath: file.path
      });
      
      // Step 3: Install plugin
      const installId = generateInstallId();
      const installation = await invoke<InstallPluginResponse>('plugin_install', {
        extractedPath: extraction.extractedPath,
        pluginId: validation.manifest!.id,
        permissions: validation.manifest!.permissions,
        autoEnable: false
      });
      
      return installId;
    } finally {
      setIsInstalling(false);
    }
  };

  const getInstallStatus = async (installId: string) => {
    const status = await invoke<GetInstallStatusResponse>('plugin_get_install_status', {
      installId
    });
    
    setCurrentInstallation(status);
    return status;
  };

  const cancelInstall = async (installId: string) => {
    await invoke<CancelInstallResponse>('plugin_cancel_install', {
      installId,
      cleanup: true
    });
    
    setIsInstalling(false);
    setCurrentInstallation(undefined);
  };

  return {
    installPlugin,
    getInstallStatus,
    cancelInstall,
    isInstalling,
    currentInstallation
  };
};
```

### Drag-and-Drop Component

```typescript
interface DragDropZoneProps {
  onFileDropped: (file: File) => void;
  accept?: string[];           // Accepted file extensions
  disabled?: boolean;
  className?: string;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFileDropped,
  accept = ['.zip', '.tar.gz'],
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer?.files || []);
    const validFiles = files.filter(file => 
      accept.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    if (validFiles.length > 0) {
      onFileDropped(validFiles[0]);
    }
  };

  return (
    <div
      className={`drag-drop-zone ${isDragOver ? 'drag-over' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drag-drop-content">
        <div className="drag-drop-icon">📦</div>
        <div className="drag-drop-text">
          {isDragOver ? '释放文件以安装插件' : '拖拽插件文件到此处'}
        </div>
        <div className="drag-drop-hint">
          支持 {accept.join(', ')} 格式
        </div>
      </div>
    </div>
  );
};
```

## Error Handling

### Error Classification

**Validation Errors**: Pre-installation validation failures
**Extraction Errors**: File extraction failures  
**Installation Errors**: Plugin installation failures
**System Errors**: File system, database, or system-level errors

### Error Recovery

1. **Validation Errors**: Show specific error messages with suggestions
2. **Extraction Errors**: Offer retry with different extraction method
3. **Installation Errors**: Provide cleanup and retry options
4. **System Errors**: Show user-friendly messages and troubleshooting steps

### Error Messages

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'INVALID_FILE_FORMAT': '不支持的文件格式，请使用 .zip 或 .tar.gz 文件',
  'MISSING_MANIFEST': '插件缺少必需的 plugin.json 文件',
  'INVALID_MANIFEST': 'plugin.json 格式错误，请检查 JSON 语法',
  'PLUGIN_ALREADY_EXISTS': '插件已存在，请先卸载现有版本',
  'PERMISSION_DENIED': '权限不足，请检查文件访问权限',
  'DISK_SPACE_INSUFFICIENT': '磁盘空间不足，请清理空间后重试'
};
```

## Security Considerations

### Input Validation
- File path validation to prevent path traversal
- Plugin ID format validation
- Permission scope validation
- File size limits

### Sandboxing
- Plugin extraction to isolated temporary directory
- Permission-based runtime restrictions
- Resource usage limits during installation

### Integrity Checks
- File hash verification for uploaded packages
- Manifest signature validation (optional)
- Dependency validation against allowed list

This API contract provides a comprehensive foundation for implementing secure drag-and-drop plugin installation functionality.