# Developer Quickstart: Productivity Launcher

**Feature**: 001-productivity-launcher
**Date**: 2025-12-30
**Status**: Phase 1 Complete

---

## Overview

This guide helps you get started with developing the Productivity Launcher. The application is built with Tauri, React, and TypeScript.

---

## Prerequisites

### Required

- **Node.js**: 20+ (https://nodejs.org)
- **Rust**: 1.75+ (https://rustup.rs)
- **pnpm**: 8+ (https://pnpm.io)

### Platform-Specific

| Platform | Additional Requirements |
|----------|------------------------|
| macOS | Xcode Command Line Tools |
| Windows | Microsoft C++ Build Tools |
| Linux | `webkit2gtk`, `libgtk-3-dev` |

---

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd kaka

# Install dependencies
pnpm install

# Install Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

### 2. Development Mode

```bash
# Start frontend dev server + Tauri
pnpm tauri dev

# Or separately:
pnpm dev          # Frontend only (Vite)
pnpm tauri dev    # Full Tauri app
```

The application will:
- Run the Vite dev server on http://localhost:1420
- Launch the Tauri window
- Enable hot reload for both frontend and backend changes

### 3. Build for Production

```bash
# Build for current platform
pnpm tauri build

# Output: src-tauri/target/release/bundle/
```

---

## Project Structure

```
kaka/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── SearchWindow.tsx
│   │   ├── ResultList.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/              # React hooks
│   │   ├── useSearch.ts
│   │   ├── useClipboard.ts
│   │   └── usePlugins.ts
│   ├── services/           # Business logic
│   │   ├── searchService.ts
│   │   ├── pluginService.ts
│   │   └── actionService.ts
│   └── lib/
│       └── plugins/        # Built-in plugins
│
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── cmds/           # Tauri commands
│   │   │   ├── app.rs
│   │   │   ├── clipboard.rs
│   │   │   ├── search.rs
│   │   │   └── plugins.rs
│   │   ├── services/       # Core services
│   │   │   ├── app_monitor.rs
│   │   │   ├── clipboard_watcher.rs
│   │   │   └── file_indexer.rs
│   │   └── models/         # Data models
│   └── Cargo.toml
│
├── tests/
│   ├── unit/               # Rust unit tests
│   ├── integration/        # Tauri command tests
│   └── e2e/                # Playwright E2E tests
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tauri.conf.json
```

---

## Development Workflow

### Adding a New Tauri Command

1. **Define the command in Rust** (`src-tauri/src/cmds/`):

```rust
// src-tauri/src/cmds/my_command.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct MyCommandRequest {
    pub param: String,
}

#[derive(Debug, Serialize)]
pub struct MyCommandResponse {
    pub result: String,
}

#[tauri::command]
pub async fn my_command(
    request: MyCommandRequest,
) -> Result<MyCommandResponse, String> {
    Ok(MyCommandResponse {
        result: format!("Hello, {}!", request.param),
    })
}
```

2. **Register the command** (`src-tauri/src/lib.rs` or `main.rs`):

```rust
mod cmds;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            cmds::my_command::my_command,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. **Call from frontend**:

```typescript
import { invoke } from '@tauri-apps/api/core';

interface MyCommandRequest {
  param: string;
}

interface MyCommandResponse {
  result: string;
}

async function myCommand(param: string): Promise<string> {
  const response = await invoke<MyCommandResponse>('my_command', {
    param,
  });
  return response.result;
}
```

### Adding a New Frontend Component

1. **Create the component** (`src/components/MyComponent.tsx`):

```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <div className="my-component">{title}</div>;
};
```

2. **Use in another component**:

```typescript
import { MyComponent } from './components/MyComponent';

function App() {
  return <MyComponent title="Hello" />;
}
```

### Adding a Built-in Plugin

1. **Create plugin directory** (`src/lib/plugins/my-plugin/`):

```typescript
// src/lib/plugins/my-plugin/index.ts
import { PluginSDK, PluginResult } from '@/lib/plugin-sdk';

const sdk: PluginSDK = {
  async onSearch(query: string, ctx): Promise<PluginResult[]> {
    if (!query.startsWith('my-plugin ')) return [];

    return [{
      id: 'result-1',
      title: 'My Plugin Result',
      subtitle: 'Press Enter to activate',
      action: async () => {
        console.log('Plugin activated!');
      }
    }];
  }
};

export default sdk;
```

2. **Register plugin** (`src/services/pluginService.ts`):

```typescript
import myPlugin from '@/lib/plugins/my-plugin';

const BUILTIN_PLUGINS = [myPlugin];
```

---

## Testing

### Unit Tests (Frontend)

```bash
# Run Vitest
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Unit Tests (Rust)

```bash
# Run cargo test
cargo test

# Specific test
cargo test test_name

# With output
cargo test -- --nocapture
```

### Integration Tests (Tauri Commands)

```bash
# Run integration tests
pnpm test:integration
```

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
pnpm playwright install

# Run E2E tests
pnpm test:e2e

# Headed mode (for debugging)
pnpm test:e2e --headed
```

---

## Debugging

### Frontend Debugging

- **Browser DevTools**: Available in Tauri dev mode (Ctrl+Shift+I / Cmd+Option+I)
- **React DevTools**: Install extension for component inspection

### Backend Debugging

```bash
# Build with debug symbols
cargo build

# Run with debugger
lldb ./target/debug/kaka
```

### Logging

**Frontend**:
```typescript
console.log('Info');
console.error('Error');
```

**Backend**:
```rust
use log::info;

info!("Info message");
```

---

## Common Tasks

### Changing the Global Hotkey

Edit `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "global-shortcut": {
      "shortcuts": [
        {
          "id": "toggle-window",
          "description": "Toggle search window",
          "keys": "Cmd+Space"
        }
      ]
    }
  }
}
```

### Adding a New Settings Option

1. **Define in preferences** (`src-tauri/src/models/preferences.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreference {
    pub key: String,
    pub value: serde_json::Value,
    pub default_value: serde_json::Value,
}
```

2. **Create Tauri command** (`src-tauri/src/cmds/settings.rs`):
```rust
#[tauri::command]
pub async fn get_setting(key: String) -> Result<serde_json::Value, String> {
    // Implementation
}
```

3. **Create frontend hook** (`src/hooks/useSettings.ts`):
```typescript
export function useSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    invoke('get_all_settings').then(setSettings);
  }, []);

  return { settings };
}
```

### Modifying the Search Algorithm

Edit `src/services/searchService.ts`:
```typescript
export function calculateScore(
  fuzzyScore: number,
  frequency: number,
  type: SearchResultType
): number {
  // Modify scoring weights here
  const fuzzyWeight = 0.5;
  const frequencyWeight = 0.3;
  const typeWeight = 0.2;

  return (
    fuzzyScore * fuzzyWeight +
    Math.min(frequency / 100, 1) * frequencyWeight +
    getTypeBoost(type) * typeWeight
  );
}
```

---

## Performance Profiling

### Frontend Performance

```bash
# Build with profiling
pnpm build --profile

# Open Chrome DevTools > Performance tab
# Record and analyze
```

### Backend Performance

```bash
# Build with flamegraph
cargo install flamegraph
flamegraph <binary>

# Or use profiler
cargo flamegraph
```

---

## Troubleshooting

### Build Errors

| Error | Solution |
|-------|----------|
| `error: linker not found` | Install Xcode Command Line Tools (macOS) or C++ Build Tools (Windows) |
| `error: Rust not found` | Install Rust via https://rustup.rs |
| `Module not found` | Run `pnpm install` |
| `Tauri CLI not found` | Run `cargo install tauri-cli` |

### Runtime Errors

| Error | Solution |
|-------|----------|
| Window not appearing | Check `tauri.conf.json` window config |
| Hotkey not working | Verify no other app is using the hotkey |
| Clipboard permission denied | Grant accessibility permissions (macOS) |
| Plugin not loading | Check plugin manifest syntax |

---

## Resources

### Documentation

- [Tauri Docs](https://tauri.app/v1/guides/)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Internal Docs

- [Feature Spec](../specs/001-productivity-launcher/spec.md)
- [Implementation Plan](../specs/001-productivity-launcher/plan.md)
- [Technical Research](../specs/001-productivity-launcher/research.md)
- [Data Model](../specs/001-productivity-launcher/data-model.md)
- [API Contracts](../specs/001-productivity-launcher/contracts/)

---

## Next Steps

1. **P1 Implementation**: Start with application discovery and launch
2. **Add Tests**: Write tests for each command as you implement
3. **Profile**: Check performance against requirements (<100ms window response)
4. **Plugin Development**: Create first built-in plugin (calculator)

---

**Happy coding!** 🚀
