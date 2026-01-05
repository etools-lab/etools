# Implementation Plan: MVP Completion & Enhancement

**Branch**: `002-mvp-completion` | **Date**: 2025-01-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-mvp-completion/spec.md`

## Summary

Complete the MVP productivity launcher by implementing 5 core features that are partially built but non-functional: clipboard history paste, file search, browser bookmark search, color conversion, and plugin system foundation. This is an enhancement feature that builds on the existing Tauri + React + TypeScript codebase from `001-productivity-launcher`, focusing on removing TODO placeholders and delivering on README promises.

## Technical Context

**Language/Version**: TypeScript 5.8+, Rust 1.75+ (Tauri backend)
**Primary Dependencies**:
- Frontend: React 19, Tauri API v2, Vite 7, color-convert (for color formats)
- Backend: Tauri v2, tauri-plugin-global-shortcut, tauri-plugin-shell, clipboard-rs (clipboard access)
- Search: fuse.js (fuzzy matching), sqlite (file index)
- Utilities: arboard (cross-platform clipboard), regex for sensitive data detection

**Storage**:
- SQLite for clipboard history, file index, and browser cache
- Local file storage for clipboard images (thumbnail generation)
- JSON for user preferences and plugin manifests
- In-memory caching for browser bookmarks (5-minute TTL)

**Testing**: Vitest (frontend), cargo test (Rust backend), Playwright (E2E)

**Target Platform**:
- macOS 12+, Windows 10+, Ubuntu 20.04+
- Desktop-first with background process architecture

**Project Type**: Desktop application (Tauri - Rust backend + web frontend)

**Performance Goals**:
- Clipboard paste: <100ms to system clipboard
- File search: <1s for 10k indexed files
- Bookmark search: <200ms from cache
- Color conversion: <50ms (instant feedback)
- Plugin execution: <500ms (with timeout)

**Constraints**:
- Must maintain backward compatibility with existing settings format
- Cannot break existing working features (app search, calculator, web search)
- Clipboard paste must work across all three platforms (macOS/Windows/Linux)
- Plugin sandbox must prevent crashes and limit permissions

**Scale/Scope**:
- ~1000 clipboard history items max
- ~10k indexed files per user
- ~500-1000 browser bookmarks
- 5-10 sample plugins for MVP
- 47 functional requirements across 5 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ⚠️ No constitution defined yet

The project constitution (`.specify/memory/constitution.md`) is currently a template without defined principles. Based on the existing codebase and requirements, the following principles are inherited from `001-productivity-launcher`:

### Inherited Core Principles

1. **Performance First**: All features must meet performance gates; clipboard paste <100ms, searches <200ms-1s
2. **Plugin Safety**: All plugins run in sandbox with explicit permissions; no direct system access without user approval
3. **Cross-Platform Parity**: Core features work identically across macOS, Windows, Linux; platform-specific code isolated
4. **Keyboard-First**: All features must be fully accessible via keyboard; mouse is optional
5. **Privacy by Default**: No data leaves the device; clipboard history stored locally only

**Gate Status**: ✅ READY TO PROCEED (no violations, all enhancements align with existing principles)

## Project Structure

### Documentation (this feature)

```text
specs/002-mvp-completion/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Data entities and relationships
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: API contracts (Tauri commands)
│   ├── clipboard.md     # Clipboard paste and history APIs
│   ├── search.md        # File search and browser bookmark APIs
│   ├── plugins.md       # Plugin loading and execution APIs
│   └── actions.md       # Color conversion quick actions
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2: Implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
kaka/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   │   ├── SearchWindow.tsx     # Main search UI (enhance for new result types)
│   │   ├── ClipboardResultItem.tsx  # Clipboard history display
│   │   ├── FileResultItem.tsx   # File search results
│   │   ├── BrowserResultItem.tsx    # Bookmark results
│   │   ├── ColorResultItem.tsx  # Color conversion results
│   │   ├── PluginResultItem.tsx # Plugin execution results
│   │   ├── SettingsPanel.tsx    # Settings (add feature toggles)
│   │   └── ui/                  # UI components
│   ├── hooks/                   # React hooks
│   │   ├── useSearch.ts         # Search logic (extend for new types)
│   │   └── useTheme.ts          # Theme management
│   ├── services/                # Frontend services
│   │   ├── searchService.ts     # Search service (extend)
│   │   └── actionService.ts     # Quick actions (ADD color conversion)
│   ├── types/                   # TypeScript types
│   │   ├── search.ts            # Search result types (extend)
│   │   ├── clipboard.ts         # Clipboard types
│   │   ├── plugin.ts            # Plugin types
│   │   └── settings.ts          # Settings types (extend)
│   └── styles/                  # CSS files
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── cmds/                # Tauri command handlers
│   │   │   ├── clipboard.rs     # Clipboard commands (FIX paste function)
│   │   │   ├── search.rs        # Search commands (extend for files/bookmarks)
│   │   │   ├── plugins.rs       # Plugin commands (complete TODOs)
│   │   │   └── settings.rs      # Settings commands
│   │   ├── services/            # Backend services
│   │   │   ├── clipboard_watcher.rs  # Clipboard monitoring service
│   │   │   ├── file_indexer.rs       # File indexing service (complete)
│   │   │   ├── browser_reader.rs     # Browser bookmark reader (complete)
│   │   │   └── plugin_sandbox.rs     # Plugin execution sandbox
│   │   ├── db/                  # Database modules
│   │   │   ├── clipboard.rs     # Clipboard database
│   │   │   ├── files.rs         # File index database
│   │   │   └── bookmarks.rs     # Bookmark cache database
│   │   └── models/              # Data models
│   │       ├── clipboard.rs     # Clipboard item model
│   │       ├── file_entry.rs    # File entry model
│   │       ├── bookmark.rs      # Bookmark model
│   │       └── plugin.rs        # Plugin manifest model
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── tests/                       # Test files
│   ├── unit/                    # Vitest unit tests
│   ├── integration/             # Tauri command integration tests
│   └── e2e/                     # Playwright E2E tests
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Structure Decision**: Desktop application with Tauri architecture (Rust backend + React frontend). This structure separates platform-specific Rust code from cross-platform TypeScript, enabling native performance where needed (system integration, clipboard access) while maintaining web tech flexibility for the UI and plugin system. The enhancement feature (002-mvp-completion) reuses the same structure as the base feature (001-productivity-launcher).

## Complexity Tracking

> **No constitution violations to track.** The recommended principles align with the technical approach:

| Principle | Implementation | Complexity |
|-----------|----------------|------------|
| Performance First | All features have measurable performance gates (<100ms paste, <1s file search) | Low - standard perf monitoring |
| Plugin Safety | Existing sandbox infrastructure, add permission dialogs | Medium - UI work |
| Cross-Platform Parity | Use arboard crate for cross-platform clipboard | Low - crate handles abstraction |
| Keyboard-First | All new UI components follow keyboard navigation patterns | Low - established patterns |
| Privacy by Default | All data stored locally, no network calls for core features | Low - local-only architecture |

**Overall Complexity**: **MEDIUM** - This is an enhancement feature that completes partially-built functionality. Most complexity is in completing TODOs in existing code rather than designing from scratch.

**Risk Factors**:
1. Clipboard paste across platforms - arboard crate should handle this, but needs testing on Windows/Linux
2. File indexing performance - need to verify SQLite performance with 10k files
3. Plugin execution safety - sandbox needs thorough testing to prevent crashes
