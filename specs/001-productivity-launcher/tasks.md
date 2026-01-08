# Tasks: Productivity Launcher (Productivity Launcher)

**Input**: Design documents from `/specs/001-productivity-launcher/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in the feature specification. Test tasks are not included in this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Include exact file paths in descriptions

## Path Conventions

- **Backend (Rust)**: `src-tauri/src/`
- **Frontend (TypeScript/React)**: `src/`
- **Tests**: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create src-tauri/src/cmds/ directory for Tauri command handlers
- [x] T002 Create src-tauri/src/services/ directory for core services
- [x] T003 [P] Create src-tauri/src/models/ directory for data models
- [x] T004 [P] Create src-tauri/src/db/ directory for database layer
- [x] T005 [P] Create src/components/ directory for React components
- [x] T006 [P] Create src/hooks/ directory for React hooks
- [x] T007 [P] Create src/services/ directory for business logic
- [x] T008 [P] Create src/lib/plugins/ directory for built-in plugins
- [x] T009 Add fuse.js dependency for fuzzy matching in package.json
- [x] T010 Add date-fns, qrcode dependencies to package.json
- [x] T011 [P] Configure Vite for Tauri development in vite.config.ts
- [x] T012 [P] Configure TypeScript strict mode in tsconfig.json
- [x] T013 [P] Setup Tauri window configuration (always on top, decorations: false) in src-tauri/tauri.conf.json
- [x] T014 [P] Setup global shortcut plugin in src-tauri/tauri.conf.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Storage

- [x] T015 Create SQLite database initialization module in src-tauri/src/db/mod.rs
- [x] T016 [P] Implement files_index.db schema (files table with indexes) in src-tauri/src/db/files.rs
- [x] T017 [P] Implement browser_cache.db schema (browser_data table with indexes) in src-tauri/src/db/browser.rs

### Core Types & Models

- [x] T018 Define SearchResult TypeScript interface in src/types/search.ts
- [x] T019 [P] Define SearchResultType enum in src/types/search.ts
- [x] T020 [P] Define ApplicationEntry Rust struct in src-tauri/src/models/app.rs
- [x] T021 [P] Define ClipboardItem Rust struct in src-tauri/src/models/clipboard.rs
- [x] T022 [P] Define Plugin Rust struct in src-tauri/src/models/plugin.rs
- [x] T023 [P] Define UserPreference Rust struct in src-tauri/src/models/preferences.rs

### Settings & Preferences

- [x] T024 Create settings command handler in src-tauri/src/cmds/settings.rs
- [x] T025 Implement get_setting Tauri command in src-tauri/src/cmds/settings.rs
- [x] T026 Implement set_setting Tauri command in src-tauri/src/cmds/settings.rs
- [x] T027 Implement get_all_settings Tauri command in src-tauri/src/cmds/settings.rs
- [x] T028 Create default preferences.json template in src-tauri/assets/
- [x] T029 Initialize preferences on first run in src-tauri/src/cmds/settings.rs

### Window Management

- [x] T030 Implement show_window Tauri command in src-tauri/src/cmds/window.rs
- [x] T031 Implement hide_window Tauri command in src-tauri/src/cmds/window.rs
- [x] T032 Register global shortcut (Cmd+Space / Alt+Space) in src-tauri/src/cmds/window.rs
- [x] T033 [P] Setup window state persistence (position, size) in src-tauri/src/cmds/window.rs

### Search Infrastructure

- [x] T034 Create search service module in src/services/searchService.ts
- [x] T035 Implement fuse.js integration with scoring algorithm in src/services/searchService.ts
- [x] T036 Create search command handler in src-tauri/src/cmds/search.rs
- [x] T037 Implement unified search Tauri command in src-tauri/src/cmds/search.rs
- [x] T038 [P] Implement debounced search (150ms) in src/services/searchService.ts

### Plugin SDK Base

- [x] T039 Create plugin SDK types in src/lib/plugin-sdk/types.ts
- [x] T040 Define PluginContext interface in src/lib/plugin-sdk/types.ts
- [x] T041 [P] Define PluginSDK interface in src/lib/plugin-sdk/types.ts
- [x] T042 Create plugin command handler in src-tauri/src/cmds/plugins.rs
- [x] T043 Implement plugin storage directory setup in src-tauri/src/cmds/plugins.rs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Application Launch (Priority: P1) 🎯 MVP

**Goal**: Users press global hotkey, type application name, and launch with single keystroke

**Independent Test**: Install app, set global hotkey, launch installed applications. Verify window appears <100ms and apps launch correctly

### Backend - Application Discovery

- [x] T044 [P] [US1] Create app monitor service in src-tauri/src/services/app_monitor.rs
- [x] T045 [P] [US1] Implement macOS app discovery (scan /Applications, parse .app bundles) in src-tauri/src/services/app_monitor.rs
- [x] T046 [P] [US1] Implement Windows app discovery (registry + start menu) in src-tauri/src/services/app_monitor.rs
- [x] T047 [P] [US1] Implement Linux app discovery (.desktop files) in src-tauri/src/services/app_monitor.rs
- [x] T048 [US1] Create app discovery cache (in-memory) in src-tauri/src/services/app_monitor.rs

### Backend - App Launching Commands

- [x] T049 [US1] Create app command handler in src-tauri/src/cmds/app.rs
- [x] T050 [US1] Implement get_installed_apps Tauri command in src-tauri/src/cmds/app.rs
- [x] T051 [US1] Implement launch_app Tauri command in src-tauri/src/cmds/app.rs
- [x] T052 [US1] Implement get_app_icon Tauri command in src-tauri/src/cmds/app.rs
- [x] T053 [US1] Implement track_app_usage Tauri command in src-tauri/src/cmds/app.rs

### Frontend - Search UI

- [x] T054 [P] [US1] Create SearchWindow component in src/components/SearchWindow.tsx
- [x] T055 [P] [US1] Create ResultList component in src/components/ResultList.tsx
- [x] T056 [US1] Create SearchResultItem component in src/components/SearchResultItem.tsx
- [x] T057 [US1] Implement search input with auto-focus in src/components/SearchWindow.tsx
- [x] T058 [US1] Implement keyboard navigation (arrows, enter, escape) in src/components/SearchWindow.tsx
- [x] T059 [US1] Connect to get_installed_apps command in src/components/SearchWindow.tsx
- [x] T060 [US1] Integrate searchService for app search in src/components/SearchWindow.tsx
- [x] T061 [US1] Handle app launch on Enter key in src/components/SearchWindow.tsx
- [x] T062 [US1] Implement window hide on blur/outside click in src/components/SearchWindow.tsx

### Frontend - Hooks

- [x] T063 [P] [US1] Create useSearch hook in src/hooks/useSearch.ts
- [x] T064 [US1] Implement debounced search query in src/hooks/useSearch.ts
- [x] T065 [US1] Implement keyboard navigation state in src/hooks/useSearch.ts
- [x] T066 [US1] Connect to Tauri search command in src/hooks/useSearch.ts

### Integration

- [x] T067 [US1] Wire SearchWindow to global shortcut in src/App.tsx
- [x] T068 [US1] Update app usage tracking after launch in src/components/SearchWindow.tsx
- [x] T069 [US1] Implement result ranking with frequency boost in src/services/searchService.ts

**Checkpoint**: User Story 1 complete - MVP is functional and testable independently

---

## Phase 4: User Story 2 - System Clipboard History (Priority: P2)

**Goal**: Users access clipboard history (text/images) through search and paste previous items

**Independent Test**: Copy multiple items, invoke search with "clip:", verify items appear and paste works

### Backend - Clipboard Monitoring

- [x] T070 [P] [US2] Create clipboard watcher service in src-tauri/src/services/clipboard_watcher.rs
- [x] T071 [P] [US2] Implement clipboard polling (500ms) in src-tauri/src/services/clipboard_watcher.rs
- [x] T072 [P] [US2] Implement content hash deduplication in src-tauri/src/services/clipboard_watcher.rs
- [x] T073 [US2] Create clipboard storage directory structure in src-tauri/src/services/clipboard_watcher.rs
- [x] T074 [US2] Implement rotating JSON file storage (one per day) in src-tauri/src/services/clipboard_watcher.rs
- [x] T075 [US2] Implement sensitive content detection (password managers) in src-tauri/src/services/clipboard_watcher.rs
- [x] T076 [US2] Implement auto-expiration (2min sensitive, 30days normal) in src-tauri/src/services/clipboard_watcher.rs
- [x] T077 [US2] Implement FIFO eviction (max 1000 items) in src-tauri/src/services/clipboard_watcher.rs

### Backend - Clipboard Commands

- [x] T078 [US2] Create clipboard command handler in src-tauri/src/cmds/clipboard.rs
- [x] T079 [US2] Implement get_clipboard_history Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T080 [US2] Implement get_clipboard_item Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T081 [US2] Implement paste_clipboard_item Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T082 [US2] Implement delete_clipboard_item Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T083 [US2] Implement clear_clipboard_history Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T084 [US2] Implement get_clipboard_settings Tauri command in src-tauri/src/cmds/clipboard.rs
- [x] T085 [US2] Implement set_clipboard_settings Tauri command in src-tauri/src/cmds/clipboard.rs

### Frontend - Clipboard UI

- [x] T086 [P] [US2] Create ClipboardResultItem component in src/components/ClipboardResultItem.tsx
- [x] T087 [P] [US2] Create image preview thumbnail in src/components/ClipboardResultItem.tsx
- [x] T088 [US2] Add clipboard trigger detection ("clip:") in src/hooks/useSearch.ts
- [x] T089 [US2] Integrate clipboard results in search in src/components/SearchWindow.tsx
- [x] T090 [US2] Handle paste on Enter in src/components/ClipboardResultItem.tsx

### Frontend - Clipboard Hook

- [x] T091 [P] [US2] Create useClipboard hook in src/hooks/useClipboard.ts
- [x] T092 [US2] Connect to clipboard commands in src/hooks/useClipboard.ts
- [x] T093 [US2] Implement clipboard search filtering in src/hooks/useClipboard.ts

**Checkpoint**: User Story 2 complete - clipboard history works independently

---

## Phase 5: User Story 3 - Plugin System & Extensibility (Priority: P3)

**Goal**: Developers create plugins, users install and use them

**Independent Test**: Install sample plugin, invoke via search, verify plugin results appear and work

### Backend - Plugin Infrastructure

- [x] T094 [P] [US3] Create plugin sandbox service in src-tauri/src/services/plugin_sandbox.rs
- [x] T095 [P] [US3] Implement Web Worker isolation in src-tauri/src/services/plugin_sandbox.rs
- [x] T096 [US3] Implement plugin manifest validation in src-tauri/src/cmds/plugins.rs
- [x] T097 [US3] Implement permission checking in src-tauri/src/services/plugin_sandbox.rs
- [x] T098 [US3] Implement plugin error isolation (disable on crash) in src-tauri/src/services/plugin_sandbox.rs

### Backend - Plugin Commands

- [x] T099 [US3] Implement list_plugins Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T100 [US3] Implement install_plugin Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T101 [US3] Implement uninstall_plugin Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T102 [US3] Implement enable_plugin Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T103 [US3] Implement disable_plugin Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T104 [US3] Implement get_plugin_manifest Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T105 [US3] Implement reload_plugin Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T106 [US3] Implement grant_plugin_permission Tauri command in src-tauri/src/cmds/plugins.rs
- [x] T107 [US3] Implement revoke_plugin_permission Tauri command in src-tauri/src/cmds/plugins.rs

### Frontend - Plugin SDK

- [x] T108 [P] [US3] Create PluginSDK implementation in src/lib/plugin-sdk/index.ts
- [x] T109 [US3] Implement plugin context with permission checks in src/lib/plugin-sdk/index.ts
- [x] T110 [US3] Implement plugin storage API in src/lib/plugin-sdk/index.ts
- [x] T111 [US3] Implement plugin loader in src/services/pluginService.ts

### Frontend - Plugin UI

- [x] T112 [P] [US3] Create PluginSettingsPanel component in src/components/PluginSettingsPanel.tsx
- [x] T113 [US3] Create PluginListItem component in src/components/PluginListItem.tsx
- [x] T114 [US3] Implement permission prompt dialog in src/components/PluginSettingsPanel.tsx
- [x] T115 [US3] Integrate plugin results in search in src/services/searchService.ts

### Built-in Plugin Example

- [x] T116 [US3] Create sample "hello-world" plugin in src/lib/plugins/hello-world/index.ts
- [x] T117 [US3] Create sample plugin manifest in src/lib/plugins/hello-world/plugin.json

**Checkpoint**: User Story 3 complete - plugin system functional and extensible

---

## Phase 6: User Story 4 - Web Search & Quick Actions (Priority: P3)

**Goal**: Users search web directly and perform quick actions (calculator, conversions)

**Independent Test**: Type "123 * 456", verify result shown. Type "go: weather", verify browser opens

### Backend - Shell Integration

- [x] T118 [US4] Implement open_url Tauri command in src-tauri/src/cmds/shell.rs
- [x] T119 [US4] Implement get_default_browser Tauri command in src-tauri/src/cmds/shell.rs

### Frontend - Quick Actions Service

- [x] T120 [P] [US4] Create actionService in src/services/actionService.ts
- [x] T121 [P] [US4] Implement math expression detection and evaluation in src/services/actionService.ts
- [x] T122 [P] [US4] Implement hex color detection in src/services/actionService.ts
- [x] T123 [P] [US4] Implement color conversion (hex, RGB, HSL) in src/services/actionService.ts
- [x] T124 [P] [US4] Implement URL detection in src/services/actionService.ts
- [x] T125 [US4] Implement web search trigger detection ("g:", "ddg:") in src/services/actionService.ts
- [x] T126 [US4] Implement search URL generation in src/services/actionService.ts

### Frontend - Quick Actions UI

- [x] T127 [P] [US4] Create QuickActionResult component in src/components/QuickActionResult.tsx
- [x] T128 [US4] Display calculator results in src/components/QuickActionResult.tsx
- [x] T129 [US4] Display color conversions in src/components/QuickActionResult.tsx
- [x] T130 [US4] Integrate quick actions in search results in src/components/SearchWindow.tsx

### Settings

- [x] T131 [US4] Add web search engine settings to preferences.json
- [x] T132 [US4] Create search engine configuration in src-tauri/src/cmds/settings.rs

**Checkpoint**: User Story 4 complete - quick actions and web search functional

---

## Phase 7: User Story 5 - File & Browser Data Search (Priority: P4)

**Goal**: Users search local files and browser bookmarks/history

**Independent Test**: Create test files, add bookmarks, search and verify results appear <500ms

### Backend - File Indexing

- [x] T133 [P] [US5] Create file indexer service in src-tauri/src/services/file_indexer.rs
- [x] T134 [P] [US5] Implement recursive directory walk in src-tauri/src/services/file_indexer.rs
- [x] T135 [P] [US5] Implement directory exclusion patterns (node_modules, .git, etc.) in src-tauri/src/services/file_indexer.rs
- [x] T136 [P] [US5] Implement file system watcher (FSEvents/inotify/ReadDirectoryChangesW) in src-tauri/src/services/file_indexer.rs
- [x] T137 [US5] Implement incremental index updates in src-tauri/src/services/file_indexer.rs

### Backend - File Index Commands

- [x] T138 [US5] Implement index_files Tauri command in src-tauri/src/cmds/search.rs
- [x] T139 [US5] Implement get_file_index_stats Tauri command in src-tauri/src/cmds/search.rs
- [x] T140 [US5] Implement search_files Tauri command in src-tauri/src/cmds/search.rs
- [x] T141 [US5] Emit index:progress events during indexing in src-tauri/src/services/file_indexer.rs

### Backend - Browser Data Access

- [x] T142 [P] [US5] Create browser data reader in src-tauri/src/services/browser_reader.rs
- [x] T143 [P] [US5] Implement Chrome History/Bookmark reader in src-tauri/src/services/browser_reader.rs
- [x] T144 [P] [US5] Implement Firefox places.sqlite reader in src-tauri/src/services/browser_reader.rs
- [x] T145 [P] [US5] Implement Safari reader in src-tauri/src/services/browser_reader.rs
- [x] T146 [P] [US5] Implement Edge reader in src-tauri/src/services/browser_reader.rs
- [x] T147 [US5] Handle database locks (copy to temp) in src-tauri/src/services/browser_reader.rs
- [x] T148 [US5] Implement browser cache expiry (5 min) in src-tauri/src/services/browser_reader.rs

### Backend - Browser Commands

- [x] T149 [US5] Implement update_browser_cache Tauri command in src-tauri/src/cmds/search.rs
- [x] T150 [US5] Implement search_browser_data Tauri command in src-tauri/src/cmds/search.rs

### Frontend - File & Browser Search UI

- [x] T151 [P] [US5] Create FileResultItem component in src/components/FileResultItem.tsx
- [x] T152 [P] [US5] Create BrowserResultItem component in src/components/BrowserResultItem.tsx
- [x] T153 [US5] Display file path in src/components/FileResultItem.tsx
- [x] T154 [US5] Display favicon in src/components/BrowserResultItem.tsx
- [x] T155 [US5] Integrate file search in unified search in src/services/searchService.ts
- [x] T156 [US5] Integrate browser search in unified search in src/services/searchService.ts

### Settings

- [x] T157 [US5] Add file index path settings to preferences.json
- [x] T158 [US5] Add excluded directories settings in src/components/SettingsPanel.tsx

**Checkpoint**: User Story 5 complete - file and browser search functional

---

## Phase 8: User Story 6 - Built-in Utilities (Priority: P4)

**Goal**: Users access built-in utilities (regex, JSON, timestamp, QR)

**Independent Test**: Type regex pattern, verify matches highlighted. Paste JSON, verify formatted

### Built-in Plugins

- [x] T159 [P] [US6] Create regex tester plugin in src/lib/plugins/regex-tester/index.ts
- [x] T160 [P] [US6] Create JSON formatter plugin in src/lib/plugins/json-formatter/index.ts
- [x] T161 [P] [US6] Create timestamp converter plugin in src/lib/plugins/timestamp/index.ts
- [x] T162 [P] [US6] Create QR code generator plugin in src/lib/plugins/qrcode/index.ts

### Plugin UI Components

- [x] T163 [US6] Create regex tester UI component in src/lib/plugins/regex-tester/ui.tsx
- [x] T164 [US6] Create JSON formatter UI component in src/lib/plugins/json-formatter/ui.tsx
- [x] T165 [US6] Create timestamp converter UI component in src/lib/plugins/timestamp/ui.tsx
- [x] T166 [US6] Create QR code display UI component in src/lib/plugins/qrcode/ui.tsx

**Checkpoint**: User Story 6 complete - built-in utilities functional

---

## Phase 9: User Story 7 - Plugin Marketplace (Priority: P5)

**Goal**: Users browse, install, update, and rate plugins

**Independent Test**: Open marketplace, install plugin, verify it appears in search

### Backend - Marketplace Infrastructure

- [x] T167 [US7] Define marketplace plugin registry structure in src-tauri/assets/marketplace.json
- [x] T168 [US7] Implement plugin update checking in src-tauri/src/cmds/plugins.rs
- [x] T169 [US7] Implement plugin download handler in src-tauri/src/cmds/plugins.rs
- [x] T170 [US7] Implement plugin rating submission in src-tauri/src/cmds/plugins.rs

### Frontend - Marketplace UI

- [x] T171 [P] [US7] Create PluginMarketplace component in src/components/PluginMarketplace.tsx
- [x] T172 [P] [US7] Create MarketplacePluginCard component in src/components/MarketplacePluginCard.tsx
- [x] T173 [P] [US7] Create PluginInstaller component in src/components/PluginInstaller.tsx
- [x] T174 [US7] Display plugin list with metadata in src/components/PluginMarketplace.tsx
- [x] T175 [US7] Implement install button with progress in src/components/PluginInstaller.tsx
- [x] T176 [US7] Implement update notification in src/components/PluginMarketplace.tsx
- [x] T177 [US7] Implement rating UI in src/components/MarketplacePluginCard.tsx

### Settings Integration

- [x] T178 [US7] Add marketplace URL setting to preferences.json
- [x] T179 [US7] Create marketplace settings panel in src/components/SettingsPanel.tsx

**Checkpoint**: User Story 7 complete - plugin marketplace functional

---

## Phase 10: User Story 8 - Customization & Theming (Priority: P5)

**Goal**: Users customize hotkeys, theme, window behavior, search preferences

**Independent Test**: Change hotkey, verify it works. Switch theme, verify colors change

### Backend - Settings Commands

- [x] T180 [US8] Implement set_hotkey Tauri command in src-tauri/src/cmds/settings.rs
- [x] T181 [US8] Implement get_hotkey Tauri command in src-tauri/src/cmds/settings.rs
- [x] T182 [US8] Implement hotkey conflict detection in src-tauri/src/cmds/window.rs

### Frontend - Settings UI

- [x] T183 [P] [US8] Create SettingsPanel component in src/components/SettingsPanel.tsx
- [x] T184 [P] [US8] Create HotkeyEditor component in src/components/HotkeyEditor.tsx
- [x] T185 [P] [US8] Create ThemeSelector component in src/components/ThemeSelector.tsx
- [x] T186 [P] [US8] Create FeatureToggle component in src/components/FeatureToggle.tsx
- [x] T187 [US8] Implement settings tabs (General, Appearance, Features) in src/components/SettingsPanel.tsx
- [x] T188 [US8] Implement theme switching (light/dark) in src/App.tsx
- [x] T189 [US8] Persist window position and size in src-tauri/src/cmds/window.rs

### CSS & Theming

- [x] T190 [P] [US8] Create light theme CSS in src/styles/theme-light.css
- [x] T191 [P] [US8] Create dark theme CSS in src/styles/theme-dark.css
- [x] T192 [US8] Implement theme class application in src/App.tsx

**Checkpoint**: User Story 8 complete - customization and theming functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T193 [P] Add error boundaries to React components in src/App.tsx
- [x] T194 [P] Implement global error handling in src-tauri/src/main.rs
- [x] T195 [P] Add loading states for async operations in src/components/SearchWindow.tsx
- [x] T196 [P] Implement keyboard shortcut help modal in src/components/HelpModal.tsx
- [x] T197 [P] Add about dialog in src/components/AboutDialog.tsx
- [x] T198 [P] Create application icon assets in src-tauri/icons/
- [x] T199 [P] Optimize bundle size (code splitting) in vite.config.ts
- [x] T200 [P] Implement performance monitoring in src-tauri/src/services/performance.rs
- [x] T201 Add accessibility attributes (ARIA) to all components
- [x] T202 Implement screen reader announcements in src/components/SearchWindow.tsx
- [x] T203 Add startup time optimization (lazy loading) in src/main.tsx
- [x] T204 Create user documentation in README.md
- [x] T205 Update package.json with proper scripts and metadata
- [x] T206 Verify all performance requirements (<100ms window, <200ms search)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phase 3-10 (User Stories) ← Can proceed in parallel after Foundational
    ↓
Phase 11 (Polish)
```

### User Story Dependencies

| User Story | Depends On | Can Run Parallel With |
|------------|------------|----------------------|
| US1 - App Launch | Foundational only | US2, US3, US4 |
| US2 - Clipboard | Foundational only | US1, US3, US4 |
| US3 - Plugins | Foundational only | US1, US2, US4 |
| US4 - Quick Actions | Foundational only | US1, US2, US3 |
| US5 - File/Browser Search | Foundational only | US1-US4 |
| US6 - Utilities | Foundational + US3 (plugins) | US1-US5 |
| US7 - Marketplace | Foundational + US3 (plugins) | US1-US6 |
| US8 - Customization | Foundational only | US1-US7 |

### Within Each User Story

1. Backend services before commands
2. Commands before frontend integration
3. UI components before hooks
4. Hooks before integration in main components
5. Integration before testing/validation

### Parallel Opportunities

**Within Phase 1 (Setup)**: All [P] tasks can run in parallel

**Within Phase 2 (Foundational)**:
- T016, T017 (DB schemas)
- T020-T023 (Model definitions)
- T033 (Window state)

**Within US1**: T044-T047 (app discovery platforms), T054-T055 (UI components)

**Within US2**: T070-T073 (clipboard backend), T086-T087 (UI components)

**Within US3**: T094-T095 (sandbox), T108 (SDK), T112-T113 (UI)

**Within US4**: T121-T124 (action detectors), T127 (UI)

**Within US5**: T133-T136 (indexing), T142-T145 (browser readers), T151-T152 (UI)

**Across User Stories**: After Foundational phase, all user stories can be developed in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all platform app discovery tasks together:
Task T045: "Implement macOS app discovery in src-tauri/src/services/app_monitor.rs"
Task T046: "Implement Windows app discovery in src-tauri/src/services/app_monitor.rs"
Task T047: "Implement Linux app discovery in src-tauri/src/services/app_monitor.rs"

# Launch all UI component creation tasks together:
Task T054: "Create SearchWindow component in src/components/SearchWindow.tsx"
Task T055: "Create ResultList component in src/components/ResultList.tsx"
Task T056: "Create SearchResultItem component in src/components/SearchResultItem.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (T001-T014)
2. Complete **Phase 2: Foundational** (T015-T043) ← CRITICAL
3. Complete **Phase 3: User Story 1** (T044-T069)
4. **STOP and VALIDATE**: Test app launching independently
5. Deploy/demo MVP

**MVP Deliverable**: Working app launcher with global hotkey, fuzzy search, keyboard navigation

### Incremental Delivery

| Sprint | Focus | Tasks | Deliverable |
|--------|-------|-------|-------------|
| 1 | Foundation | T001-T043 | Complete infrastructure |
| 2 | MVP | T044-T069 | App launcher (US1) |
| 3 | Clipboard | T070-T093 | Clipboard history (US2) |
| 4 | Plugins | T094-T117 | Plugin system (US3) |
| 5 | Quick Actions | T118-T132 | Calculator, web search (US4) |
| 6 | File Search | T133-T158 | File/browser search (US5) |
| 7 | Utilities | T159-T166 | Built-in tools (US6) |
| 8 | Marketplace | T167-T179 | Plugin marketplace (US7) |
| 9 | Polish | T180-T206 | Customization, polish |

### Parallel Team Strategy

With 3 developers after Foundational phase:

| Developer | Sprint 1 | Sprint 2 | Sprint 3 |
|-----------|----------|----------|----------|
| Dev A | US1 (App Launch) | US4 (Quick Actions) | US7 (Marketplace) |
| Dev B | US2 (Clipboard) | US5 (File Search) | US8 (Customization) |
| Dev C | US3 (Plugins) | US6 (Utilities) | Polish |

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 206 |
| **Setup Tasks** | 14 |
| **Foundational Tasks** | 29 |
| **US1 Tasks** | 26 |
| **US2 Tasks** | 24 |
| **US3 Tasks** | 24 |
| **US4 Tasks** | 15 |
| **US5 Tasks** | 26 |
| **US6 Tasks** | 8 |
| **US7 Tasks** | 13 |
| **US8 Tasks** | 13 |
| **Polish Tasks** | 14 |
| **Parallelizable ([P])** | ~95 tasks (46%) |

### Format Validation

✅ All tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ All file paths are included
✅ All user story tasks are labeled (US1-US8)
✅ Setup and Foundational phases have no story labels
✅ Polish phase has no story labels

### Independent Test Criteria

| User Story | Independent Test | Validation Point |
|------------|------------------|------------------|
| US1 | Install app, press hotkey, type "chr", press Enter | T069 |
| US2 | Copy items, search "clip:", paste result | T093 |
| US3 | Install plugin, type trigger, verify results | T117 |
| US4 | Type "123*456", verify result. Type "go: test", verify browser opens | T132 |
| US5 | Create file, add bookmark, search both | T158 |
| US6 | Type regex, verify matches. Paste JSON, verify formatted | T166 |
| US7 | Browse marketplace, install plugin | T179 |
| US8 | Change hotkey, verify works. Switch theme | T192 |

### MVP Scope

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 69 tasks

- Delivers core value: app launching with global hotkey
- Fully functional and independently testable
- Foundation for all other stories
- Estimated effort: ~2-3 weeks for solo developer

---

**Notes**
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Verify format: `- [ ] TXXX [P?] [Story?] Description in path/to/file`
