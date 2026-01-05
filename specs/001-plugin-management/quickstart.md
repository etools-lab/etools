# Plugin Management System - Quick Start

**Date**: 2025-01-03  
**Version**: 1.0.0  
**Purpose**: Quick start guide for implementing plugin management with drag-and-drop installation

## Overview

This guide provides step-by-step instructions for implementing the plugin management system with GitHub Release drag-and-drop installation functionality.

## Prerequisites

### Development Environment
- **Node.js**: 18+ with pnpm
- **Rust**: 1.75+ with Cargo
- **Tauri**: 2.0+ CLI installed
- **Git**: For version control

### Existing Dependencies
Ensure these are already installed in your Kaka project:
```json
// package.json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "fuse.js": "^7.0.0",
    "react": "^19",
    "typescript": "~5.8"
  }
}
```

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
serde = { version = "1", features = ["derive"] }
rusqlite = { version = "0.32", features = ["bundled"] }
tokio = { version = "1", features = ["full"] }
```

## Implementation Steps

### Step 1: Frontend - Drag-and-Drop Component

#### 1.1 Install Additional Dependencies
```bash
pnpm add react-dropzone @tanstack/react-query zustand
pnpm add -D @types/react-dropzone
```

#### 1.2 Create DragDropZone Component
```typescript
// src/components/ui/DragDropZone.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
  accept?: string[];
  children?: React.ReactNode;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesDropped,
  disabled = false,
  accept = ['.zip', '.tar.gz'],
  children
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!disabled && acceptedFiles.length > 0) {
      onFilesDropped(acceptedFiles);
    }
  }, [disabled, onFilesDropped]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, ext) => ({ ...acc, [ext]: [] }), {}),
    noClick: true,
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`drag-drop-zone ${isDragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <input {...getInputProps()} />
      {children || (
        <div className="drag-drop-content">
          <div className="drag-drop-icon">📦</div>
          <div className="drag-drop-text">
            {isDragActive ? '释放文件以安装插件' : '拖拽插件文件到此处'}
          </div>
          <div className="drag-drop-hint">
            支持 {accept.join(', ')} 格式
          </div>
        </div>
      )}
    </div>
  );
};
```

#### 1.3 Create Plugin Installer Hook
```typescript
// src/hooks/usePluginInstaller.ts
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface InstallProgress {
  stage: 'validating' | 'extracting' | 'installing' | 'verifying' | 'complete';
  progress: number;
  message: string;
}

export const usePluginInstaller = () => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);

  const installFromFile = useCallback(async (file: File) => {
    setIsInstalling(true);
    setProgress({ stage: 'validating', progress: 0, message: '验证插件包...' });

    try {
      // Get file path from Tauri
      const filePath = await invoke<string>('get_file_path', { fileName: file.name });
      
      // Validate package
      setProgress({ stage: 'validating', progress: 25, message: '验证插件格式...' });
      const validation = await invoke('plugin_validate_package', { filePath });
      
      if (!validation.isValid) {
        throw new Error('Plugin validation failed');
      }

      // Extract package
      setProgress({ stage: 'extracting', progress: 50, message: '解压插件文件...' });
      const extracted = await invoke('plugin_extract_package', { filePath });

      // Install plugin
      setProgress({ stage: 'installing', progress: 75, message: '安装插件...' });
      await invoke('plugin_install', { 
        extractedPath: extracted.path,
        pluginId: extracted.manifest.id 
      });

      // Verify installation
      setProgress({ stage: 'verifying', progress: 90, message: '验证安装...' });
      await invoke('plugin_verify_installation', { 
        pluginId: extracted.manifest.id 
      });

      setProgress({ stage: 'complete', progress: 100, message: '安装完成!' });

    } catch (error) {
      console.error('Installation failed:', error);
      setProgress(null);
      throw error;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    installFromFile,
    isInstalling,
    progress
  };
};
```

#### 1.4 Add CSS Styles
```css
/* src/styles/components/drag-drop-zone.css */
.drag-drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

.drag-drop-zone.active {
  border-color: #007acc;
  background-color: #e3f2fd;
}

.drag-drop-zone.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drag-drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.drag-drop-icon {
  font-size: 3rem;
}

.drag-drop-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.drag-drop-hint {
  font-size: 0.9rem;
  color: #666;
}
```

### Step 2: Backend - Plugin Installation Commands

#### 2.1 Add Dependencies to Cargo.toml
```toml
[dependencies]
# Existing dependencies...
zip = "0.6"
tar = "0.4"
flate2 = "1.0"
uuid = { version = "1.0", features = ["v4"] }
thiserror = "1.0"
anyhow = "1.0"
```

#### 2.2 Create Plugin Installer Service
```rust
// src-tauri/src/services/plugin_installer.rs
use std::fs;
use std::path::PathBuf;
use zip::ZipArchive;
use flate2::read::GzDecoder;
use tar::Archive;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use anyhow::{Result, anyhow};

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallProgress {
    pub stage: String,
    pub progress: u8,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageValidation {
    pub is_valid: bool,
    pub manifest: Option<PluginManifest>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

pub struct PluginInstaller {
    temp_dir: PathBuf,
}

impl PluginInstaller {
    pub fn new(temp_dir: PathBuf) -> Self {
        Self { temp_dir }
    }

    pub async fn validate_package(&self, file_path: &str) -> Result<PackageValidation> {
        // Implementation for validating plugin package
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        // Check file extension
        let path = PathBuf::from(file_path);
        if !self.is_supported_format(&path) {
            errors.push("Unsupported file format".to_string());
            return Ok(PackageValidation {
                is_valid: false,
                manifest: None,
                errors,
                warnings,
            });
        }

        // Extract and validate manifest
        let manifest = self.extract_and_validate_manifest(&path).await?;
        
        Ok(PackageValidation {
            is_valid: errors.is_empty(),
            manifest: Some(manifest),
            errors,
            warnings,
        })
    }

    pub async fn extract_package(&self, file_path: &str) -> Result<ExtractionResult> {
        let path = PathBuf::from(file_path);
        let extract_dir = self.temp_dir.join(Uuid::new_v4().to_string());
        
        fs::create_dir_all(&extract_dir)?;

        match path.extension().and_then(|s| s.to_str()) {
            Some("zip") => self.extract_zip(&path, &extract_dir).await?,
            Some("gz") => self.extract_tar_gz(&path, &extract_dir).await?,
            _ => return Err(anyhow!("Unsupported file format")),
        }

        let manifest = self.load_manifest(&extract_dir).await?;
        
        Ok(ExtractionResult {
            path: extract_dir.to_string_lossy().to_string(),
            manifest,
        })
    }

    pub async fn install_plugin(
        &self,
        extracted_path: &str,
        plugin_id: &str,
    ) -> Result<()> {
        let plugins_dir = self.get_plugins_directory()?;
        let plugin_dir = plugins_dir.join(plugin_id);
        
        // Move extracted files to plugin directory
        self.move_directory(&PathBuf::from(extracted_path), &plugin_dir).await?;
        
        // Register plugin in database
        self.register_plugin_in_database(&plugin_dir).await?;
        
        Ok(())
    }

    // Private helper methods...
    fn is_supported_format(&self, path: &PathBuf) -> bool {
        match path.extension().and_then(|s| s.to_str()) {
            Some("zip") | Some("gz") => true,
            _ => false,
        }
    }

    async fn extract_zip(&self, zip_path: &PathBuf, extract_dir: &PathBuf) -> Result<()> {
        let file = fs::File::open(zip_path)?;
        let mut archive = ZipArchive::new(file)?;
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = extract_dir.join(file.name());
            
            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)?;
                }
                let mut outfile = fs::File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }
        }
        
        Ok(())
    }

    async fn extract_tar_gz(&self, tar_path: &PathBuf, extract_dir: &PathBuf) -> Result<()> {
        let file = fs::File::open(tar_path)?;
        let decoder = GzDecoder::new(file);
        let mut archive = Archive::new(decoder);
        
        archive.unpack(extract_dir)?;
        Ok(())
    }

    // Additional helper methods...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub path: String,
    pub manifest: PluginManifest,
}
```

#### 2.3 Register New Commands
```rust
// src-tauri/src/cmds/plugins.rs (add these commands)

use crate::services::plugin_installer::PluginInstaller;
use std::path::PathBuf;

#[tauri::command]
pub async fn plugin_validate_package(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<PackageValidation, String> {
    let temp_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?;
    
    let installer = PluginInstaller::new(temp_dir.join("temp"));
    installer
        .validate_package(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_extract_package(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<ExtractionResult, String> {
    let temp_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?;
    
    let installer = PluginInstaller::new(temp_dir.join("temp"));
    installer
        .extract_package(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_install(
    app_handle: tauri::AppHandle,
    extracted_path: String,
    plugin_id: String,
) -> Result<(), String> {
    let temp_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get temp dir: {}", e))?;
    
    let installer = PluginInstaller::new(temp_dir.join("temp"));
    installer
        .install_plugin(&extracted_path, &plugin_id)
        .await
        .map_err(|e| e.to_string())
}

// Register commands in main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Existing commands...
            plugin_validate_package,
            plugin_extract_package,
            plugin_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 3: Plugin Manager Integration

#### 3.1 Update Plugin Manager Component
```typescript
// src/components/PluginManager/PluginManager.tsx
import React, { useState } from 'react';
import { usePluginInstaller } from '../../hooks/usePluginInstaller';
import { DragDropZone } from '../ui/DragDropZone';
import { PluginList } from './PluginList';

export const PluginManager: React.FC = () => {
  const [showInstaller, setShowInstaller] = useState(false);
  const { installFromFile, isInstalling, progress } = usePluginInstaller();

  const handleFileDropped = async (files: File[]) => {
    if (files.length > 0) {
      try {
        await installFromFile(files[0]);
        // Refresh plugin list
        // await refreshPlugins();
      } catch (error) {
        console.error('Installation failed:', error);
        // Show error notification
      }
    }
  };

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <h2>插件管理</h2>
        <button
          onClick={() => setShowInstaller(!showInstaller)}
          className="install-button"
        >
          安装插件
        </button>
      </div>

      {showInstaller && (
        <div className="plugin-installer-section">
          <h3>安装新插件</h3>
          <DragDropZone
            onFilesDropped={handleFileDropped}
            disabled={isInstalling}
          />
          
          {progress && (
            <div className="install-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <div className="progress-text">
                {progress.message} ({progress.progress}%)
              </div>
            </div>
          )}
        </div>
      )}

      <PluginList />
    </div>
  );
};
```

### Step 4: Testing

#### 4.1 Create Test Plugin Package
```bash
# Create a test plugin
mkdir test-plugin
cd test-plugin

# Create plugin.json
cat > plugin.json << EOF
{
  "id": "test-plugin",
  "name": "Test Plugin",
  "version": "1.0.0",
  "description": "A test plugin for drag-and-drop installation",
  "author": "Kaka Team",
  "entry": "index.ts",
  "permissions": [],
  "triggers": [
    {
      "keyword": "test:",
      "description": "Test plugin trigger"
    }
  ]
}
EOF

# Create index.ts
cat > index.ts << EOF
export default {
  manifest: {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Kaka Team',
    permissions: [],
    triggers: ['test:']
  },
  onSearch: (query: string) => {
    if (query.startsWith('test:')) {
      return [{
        id: 'test-result',
        title: 'Test Result',
        description: 'This is a test plugin result',
        action: () => alert('Test plugin executed!')
      }];
    }
    return [];
  }
};
EOF

# Create zip package
cd ..
zip -r test-plugin.zip test-plugin/
```

#### 4.2 Run Tests
```bash
# Start development server
pnpm tauri dev

# Test drag-and-drop installation
# 1. Open plugin manager
# 2. Click "安装插件"
# 3. Drag test-plugin.zip to the drop zone
# 4. Verify installation success
# 5. Check plugin appears in the list
# 6. Test plugin functionality
```

## Next Steps

After completing the basic implementation:

1. **Add Error Handling**: Implement comprehensive error handling and user notifications
2. **Security Enhancements**: Add plugin signature verification and sandboxing
3. **Progress Tracking**: Implement real-time progress updates with WebSocket events
4. **Bulk Operations**: Add support for installing multiple plugins
5. **Plugin Dependencies**: Handle plugin dependency resolution and installation

## Common Issues and Solutions

### Issue: "Invalid file format"
**Solution**: Ensure the plugin package is a valid .zip or .tar.gz file with proper structure

### Issue: "Permission denied"
**Solution**: Check file system permissions and ensure app has write access to plugins directory

### Issue: "Plugin validation failed"
**Solution**: Verify plugin.json follows the correct format and contains all required fields

### Issue: "Installation stuck"
**Solution**: Check file size limits and ensure sufficient disk space is available

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [React Dropzone Documentation](https://react-dropzone.js.org/)
- [ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
- [Semantic Versioning](https://semver.org/)

This quick start guide provides the foundation for implementing robust drag-and-drop plugin installation in Kaka.