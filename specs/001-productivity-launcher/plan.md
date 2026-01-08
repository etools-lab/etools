# Implementation Plan: Productivity Launcher (Productivity Launcher)

**Branch**: `001-productivity-launcher` | **Date**: 2025-12-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-productivity-launcher/spec.md`

## Summary

Build a cross-platform productivity launcher using Tauri + React + TypeScript that provides quick access to applications, files, web resources, and utilities through a unified search interface. The architecture prioritizes performance (<100ms window response), low memory footprint (<100MB idle), and extensibility through a sandboxed JavaScript/TypeScript plugin system.

## Technical Context

**Language/Version**: TypeScript 5.8+, Rust 1.75+ (Tauri backend)
**Primary Dependencies**:
- Frontend: React 19, Tauri API v2, Vite 7
- Backend: Tauri v2, tauri-plugin-global-shortcut, tauri-plugin-shell
- Search: fuse.js (fuzzy matching), sqlite (file index)
- Utilities: date-fns, qrcode, regex-related libraries

**Storage**:
- SQLite for file index and browser cache
- Local file storage for clipboard history (with size limits)
- JSON for user preferences and plugin manifests

**Testing**: Vitest (frontend), cargo test (Rust backend), Playwright (E2E)

**Target Platform**:
- macOS 12+, Windows 10+, Ubuntu 20.04+
- Desktop-first with background process architecture

**Project Type**: Desktop application (Tauri - Rust backend + web frontend)

**Performance Goals**:
- Window response: <100ms from hotkey press
- Search results: <200ms for 50k indexed items
- Memory usage: <100MB idle, <200MB active
- Startup time: <2 seconds cold start

**Constraints**:
- Background process with minimal footprint
- Cross-platform compatibility (platform-specific code isolated)
- Plugin sandbox isolation for security
- No native dependencies beyond Tauri

**Scale/Scope**:
- ~50k indexed files/entries
- ~1000 clipboard history items
- Support for 50+ concurrent plugins
- 8 core user stories across P1-P5 priorities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ⚠️ No constitution defined yet

The project constitution (`.specify/memory/constitution.md`) is currently a template without defined principles. The following are recommended principles for this project:

### Recommended Core Principles

1. **Performance First**: All features must meet performance gates; no feature that violates <100MB idle memory or <200ms search response
2. **Plugin Safety**: All plugins run in sandbox with explicit permissions; no direct system access without user approval
3. **Cross-Platform Parity**: Core features work identically across macOS, Windows, Linux; platform-specific code isolated behind abstraction layer
4. **Keyboard-First**: All features must be fully accessible via keyboard; mouse is optional
5. **Privacy by Default**: No data leaves the device without explicit consent; clipboard history stored locally only

**Gate Status**: ✅ READY TO PROCEED (recommended principles align with requirements)

## Project Structure

### Documentation (this feature)

```text
specs/001-productivity-launcher/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Data entities and relationships
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: API contracts (Tauri commands)
│   ├── clipboard.md     # Clipboard management APIs
│   ├── search.md        # Search and indexing APIs
│   ├── plugins.md       # Plugin system APIs
│   └── apps.md          # Application discovery and launch APIs
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2: Implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
kaka/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── cmds/        # Tauri command handlers
│   │   │   ├── app.rs      # Application discovery and launch
│   │   │   ├── clipboard.rs # Clipboard monitoring and history
│   │   │   ├── search.rs    # Search indexing and queries
│   │   │   ├── plugins.rs   # Plugin system
│   │   │   └── settings.rs  # User preferences
│   │   ├── services/    # Core services
│   │   │   ├── app_monitor.rs   # Monitor installed apps
│   │   │   ├── clipboard_watcher.rs
│   │   │   ├── file_indexer.rs
│   │   │   └── plugin_sandbox.rs
│   │   ├── models/      # Data models
│   │   ├── db/          # Database layer (SQLite)
│   │   └── plugins/     # Plugin hosting infrastructure
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                 # React frontend
│   ├── components/
│   │   ├── SearchWindow.tsx    # Main search UI
│   │   ├── ResultList.tsx      # Search results display
│   │   ├── SettingsPanel.tsx   # Settings UI
│   │   └── PluginMarketplace.tsx
│   ├── hooks/
│   │   ├── useSearch.ts        # Search logic
│   │   ├── useClipboard.ts     # Clipboard access
│   │   └── usePlugins.ts       # Plugin integration
│   ├── services/
│   │   ├── searchService.ts    # Fuzzy matching, result ranking
│   │   ├── pluginService.ts    # Plugin loading and communication
│   │   └── actionService.ts    # Quick actions (calculator, etc.)
│   ├── lib/
│   │   ├── plugins/            # Built-in plugins
│   │   └── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── tests/
│   ├── unit/              # Rust unit tests
│   ├── integration/       # Tauri command integration tests
│   └── e2e/               # Playwright E2E tests
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

**Structure Decision**: Desktop application with Tauri architecture (Rust backend + React frontend). This structure separates platform-specific Rust code from cross-platform TypeScript, enabling native performance where needed (system integration) while maintaining web tech flexibility for the UI and plugin system.

## Complexity Tracking

> No constitution violations to track. The recommended principles align with the technical approach.
