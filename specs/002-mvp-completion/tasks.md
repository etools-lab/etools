# Tasks: MVP Completion & Enhancement

**Input**: Design documents from `/specs/002-mvp-completion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in the feature specification. Test tasks are not included in this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `src/` at repository root
- **Backend**: `src-tauri/src/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and prepare project structure

- [x] T001 Add arboard 3.4 dependency to src-tauri/Cargo.toml for cross-platform clipboard paste
- [x] T002 Add color-convert 2.0.1 dependency to package.json for color format conversion
- [x] T003 Run cargo fetch in src-tauri/ to update Rust dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update TypeScript types in src/types/clipboard.ts to include ClipboardItem interface with all fields (id, content_type, text, image_path, hash, timestamp, is_sensitive, app_source)
- [x] T005 Update TypeScript types in src/types/plugin.ts to include Plugin, PluginManifest, PluginPermission interfaces
- [x] T006 Create src/services/pluginLoader.ts with loadPlugin() function skeleton and permission checking logic
- [x] T007 Update src/types/search.ts to extend SearchResult type with 'file', 'bookmark', 'color', 'plugin' variants
- [x] T008 Add feature toggle state to src/components/SettingsPanel.tsx for file_search, browser_search, clipboard_history_enabled options

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Clipboard History Management (Priority: P1) 🎯 MVP

**Goal**: Fix clipboard paste functionality so users can paste clipboard history items back into their active applications

**Independent Test**: Copy text "hello world", open launcher with Option+Space, type "clip:", see result, press Enter, paste in another app to verify it works

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement paste_to_clipboard() using arboard in src-tauri/src/cmds/clipboard.rs (replaces TODO at line 83)
- [x] T010 [P] [US1] Create Clipboard model with all fields in src-tauri/src/models/clipboard.rs
- [x] T011 [US1] Update get_clipboard_item() to return ClipboardItem model in src-tauri/src/cmds/clipboard.rs
- [x] T012 [US1] Implement sensitive data detection regex patterns in src-tauri/src/services/clipboard_watcher.rs (passwords, API keys)
- [x] T013 [US1] Implement automatic cleanup of sensitive items after 2 minutes in src-tauri/src/services/clipboard_watcher.rs
- [x] T014 [US1] Implement automatic cleanup of oldest items when >1000 in src-tauri/src/services/clipboard_watcher.rs
- [x] T015 [P] [US1] Update src/components/ClipboardResultItem.tsx to display clipboard item with delete button
- [x] T016 [P] [US1] Update src/hooks/useSearch.ts to call paste_clipboard_item command when result is selected
- [x] T017 [US1] Add clipboard feature toggle to SettingsPanel in src/components/SettingsPanel.tsx (enable/disable, clear history button)

**Checkpoint**: At this point, User Story 1 should be fully functional - copy text, search "clip:", press Enter, paste works in another app

---

## Phase 4: User Story 2 - File System Search (Priority: P2)

**Goal**: Enable file system search so users can quickly find and open files by typing filenames

**Independent Test**: Create test files in ~/Documents, enable file search in settings, trigger index, search for filename, verify results appear within 1 second

### Implementation for User Story 2

- [x] T018 [P] [US2] Implement walk_directory() to recursively scan paths in src-tauri/src/services/file_indexer.rs
- [x] T019 [P] [US2] Implement upsert_file_entry() to add/update files in database in src-tauri/src/services/file_indexer.rs
- [x] T020 [P] [US2] Implement file exclusion logic for node_modules, .git, target, etc. in src-tauri/src/services/file_indexer.rs
- [x] T021 [US2] Implement search_files() Tauri command with SQL LIKE query in src-tauri/src/cmds/search.rs
- [x] T022 [US2] Implement file ranking by relevance score and path depth in src-tauri/src/cmds/search.rs
- [x] T023 [P] [US2] Create src/components/FileResultItem.tsx to display file search results with file type icon
- [x] T024 [P] [US2] Implement open_file() Tauri command using tauri-plugin-shell in src-tauri/src/cmds/search.rs
- [x] T025 [US2] Update src/hooks/useSearch.ts to call search_files command when file search is enabled
- [x] T026 [US2] Add file search settings to SettingsPanel in src/components/SettingsPanel.tsx (enable toggle, indexed paths list, reindex button)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Browser Bookmark Search (Priority: P2)

**Goal**: Enable browser bookmark search so users can quickly find and open bookmarks without opening browsers

**Independent Test**: Ensure Chrome/Firefox/Safari have bookmarks, enable browser search in settings, search for bookmark title, verify results appear within 200ms

### Implementation for User Story 3

- [x] T027 [P] [US3] Implement ChromeBookmarkReader with JSON parsing in src-tauri/src/services/browser_reader.rs
- [x] T028 [P] [US3] Implement FirefoxBookmarkReader with SQLite query in src-tauri/src/services/browser_reader.rs
- [x] T029 [P] [US3] Implement SafariBookmarkReader with plist parsing in src-tauri/src/services/browser_reader.rs
- [x] T030 [US3] Implement update_browser_cache() Tauri command in src-tauri/src/cmds/search.rs
- [x] T031 [US3] Implement bookmark cache with 5-minute TTL in src-tauri/src/cmds/search.rs
- [x] T032 [US3] Implement search_browser_data() Tauri command with cache TTL check in src-tauri/src/cmds/search.rs
- [x] T033 [P] [US3] Create src/components/BrowserResultItem.tsx to display bookmark results with favicon
- [x] T034 [P] [US3] Implement open_url() Tauri command using tauri-plugin-shell in src-tauri/src/cmds/search.rs
- [x] T035 [US3] Update src/hooks/useSearch.ts to call search_browser_data command when browser search is enabled
- [x] T036 [US3] Add browser search settings to SettingsPanel in src/components/SettingsPanel.tsx (enable toggles per browser, refresh button)

**Checkpoint**: All user stories (1, 2, 3) should now be independently functional

---

## Phase 6: User Story 4 - Color Format Conversion (Priority: P3)

**Goal**: Add color format detection and conversion so users can convert between Hex, RGB, HSL formats

**Independent Test**: Type "#ff0000" in search, verify all formats (Hex, RGB, HSL) are displayed, click copy button, verify clipboard contains format

### Implementation for User Story 4

- [x] T037 [P] [US4] Add color format detection regex patterns to src/services/actionService.ts (Hex, RGB, HSL, named colors)
- [x] T038 [P] [US4] Implement convertColor() function using color-convert library in src/services/actionService.ts
- [x] T039 [US4] Integrate color detection into detectAction() in src/services/actionService.ts
- [x] T040 [P] [US4] Create src/components/ColorResultItem.tsx to display color conversions with swatch preview
- [x] T041 [P] [US4] Add copy buttons for each format in src/components/ColorResultItem.tsx
- [x] T042 [US4] Update src/hooks/useSearch.ts to handle color result type and display ColorResultItem

**Checkpoint**: User Stories 1-4 should now be independently functional

---

## Phase 7: User Story 5 - Plugin System Foundation (Priority: P3)

**Goal**: Complete plugin system TODOs so plugins can be loaded, validated, and executed safely

**Independent Test**: Install sample plugin (QR code generator), type trigger keyword "qr: hello", verify plugin executes and displays result

### Implementation for User Story 5

- [x] T043 [P] [US5] Complete install_plugin() with manifest validation in src-tauri/src/cmds/plugins.rs
- [x] T044 [P] [US5] Complete enable_plugin() and disable_plugin() in src-tauri/src/cmds/plugins.rs
- [x] T045 [P] [US5] Complete set_plugin_setting() and get_plugin_setting() in src-tauri/src/cmds/plugins.rs
- [x] T046 [P] [US5] Implement plugin state persistence in src-tauri/src/cmds/plugins.rs
- [x] T047 [US5] Implement permission checking logic in src/services/pluginLoader.ts (PERMISSION_MAP)
- [x] T048 [US5] Create restricted API wrapper in src/services/pluginLoader.ts (invoke with permission check)
- [x] T049 [P] [US5] Create src/components/PluginResultItem.tsx to display plugin execution results
- [x] T050 [US5] Update src/hooks/useSearch.ts to handle plugin trigger keywords and execute plugins
- [x] T051 [US5] Create sample plugin in ~/.config/kaka/plugins/hello-world/ with plugin.json and index.ts

**Checkpoint**: All user stories (1-5) should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final cleanup

- [x] T052 [P] Remove all TODO comments from src-tauri/src/cmds/clipboard.rs, src-tauri/src/services/file_indexer.rs, src-tauri/src/services/browser_reader.rs related to implemented features
- [x] T053 [P] Update README.md to remove inaccurate feature descriptions or add notes about enabled/disabled features
- [x] T054 [P] Add error boundaries and error messages for all new features in src/components/ErrorBoundary.tsx
- [x] T055 [P] Performance testing: verify clipboard paste <100ms in src-tauri/src/cmds/clipboard.rs
- [x] T056 [P] Performance testing: verify file search <1s for 10k files in src-tauri/src/cmds/search.rs
- [x] T057 [P] Performance testing: verify bookmark search <200ms in src-tauri/src/cmds/search.rs
- [x] T058 [P] Add keyboard navigation support to all new result components in src/components/
- [x] T059 [P] Ensure all new UI components respect theme preference (light/dark/system) in src/components/
- [x] T060 Validate quickstart.md workflow: run all setup steps and verify each feature works

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phase 3-7 (User Stories) ← Can proceed in parallel after Foundational
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| User Story | Priority | Can Start After | Dependencies |
|------------|----------|-----------------|--------------|
| US1 - Clipboard | P1 | Foundational | None (independent) |
| US2 - File Search | P2 | Foundational | None (independent) |
| US3 - Browser Bookmarks | P2 | Foundational | None (independent) |
| US4 - Color Conversion | P3 | Foundational | None (independent) |
| US5 - Plugin System | P3 | Foundational | None (independent) |

### Within Each User Story

- Backend commands before frontend components
- Core implementation before UI integration
- Settings integration after feature works

### Parallel Opportunities

#### Within Phase 2 (Foundational)
```bash
# Can run in parallel:
Task T004: Update clipboard types
Task T005: Update plugin types
Task T006: Create pluginLoader skeleton
Task T007: Update search types
Task T008: Add feature toggles
```

#### Within Phase 3 (US1 - Clipboard)
```bash
# Can run in parallel:
Task T009: Implement paste_to_clipboard (backend)
Task T010: Create Clipboard model (backend)
Task T015: Update ClipboardResultItem UI (frontend)
Task T016: Update useSearch hook (frontend)
```

#### Within Phase 4 (US2 - File Search)
```bash
# Can run in parallel:
Task T018: walk_directory (backend)
Task T019: upsert_file_entry (backend)
Task T020: exclusion logic (backend)
Task T023: FileResultItem UI (frontend)
Task T024: open_file command (backend)
```

#### Within Phase 5 (US3 - Browser Bookmarks)
```bash
# Can run in parallel:
Task T027: Chrome reader (backend)
Task T028: Firefox reader (backend)
Task T029: Safari reader (backend)
Task T033: BrowserResultItem UI (frontend)
Task T034: open_url command (backend)
```

#### Within Phase 6 (US4 - Color Conversion)
```bash
# Can run in parallel:
Task T037: Color detection regex
Task T038: convertColor function
Task T040: ColorResultItem UI
Task T041: Copy buttons
```

#### Within Phase 7 (US5 - Plugin System)
```bash
# Can run in parallel:
Task T043: install_plugin
Task T044: enable/disable plugins
Task T045: settings functions
Task T046: state persistence
Task T049: PluginResultItem UI
```

#### User Stories Can Proceed in Parallel
After Foundational phase completes, all 5 user stories can be worked on simultaneously by different developers.

---

## Parallel Example: Complete User Story 1 (US1)

```bash
# Launch all parallel tasks for US1 together:
Task T009: "Implement paste_to_clipboard() using arboard"
Task T010: "Create Clipboard model"
Task T015: "Update ClipboardResultItem UI"
Task T016: "Update useSearch hook"

# Then sequential:
Task T011: "Update get_clipboard_item()"
Task T012: "Sensitive data detection"
Task T013: "Auto cleanup sensitive"
Task T014: "Auto cleanup old items"
Task T017: "Settings integration"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended Starting Point

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T017)
4. **STOP and VALIDATE**: Test clipboard paste works independently
5. Demo/ship if US1 meets needs

**Deliverable**: Working clipboard paste - fixes broken promise in README

### Incremental Delivery (Full Feature)

1. Setup + Foundational → Foundation ready (T001-T008)
2. Add US1 (Clipboard) → Test independently → MVP complete! (T009-T017)
3. Add US2 (File Search) → Test independently → Enhance MVP (T018-T026)
4. Add US3 (Browser Bookmarks) → Test independently → More value (T027-T036)
5. Add US4 (Color Conversion) → Test independently → Convenience feature (T037-T042)
6. Add US5 (Plugin System) → Test independently → Extensibility (T043-T051)
7. Polish → Final cleanup (T052-T060)

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers after Foundational phase:

**Sprint 1**: Everyone completes Setup + Foundational together (T001-T008)

**Sprint 2-3** (Parallel):
- Developer A: User Story 1 - Clipboard (T009-T017)
- Developer B: User Story 2 - File Search (T018-T026)
- Developer C: User Story 3 - Browser Bookmarks (T027-T036)

**Sprint 4** (Parallel):
- Developer A: User Story 4 - Color Conversion (T037-T042)
- Developer B: User Story 5 - Plugin System (T043-T051)
- Developer C: Polish and testing (T052-T060)

**Sprint 5**: Integration and final testing

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 60 |
| **Setup Tasks** | 3 |
| **Foundational Tasks** | 5 |
| **US1 Tasks** | 9 |
| **US2 Tasks** | 9 |
| **US3 Tasks** | 10 |
| **US4 Tasks** | 6 |
| **US5 Tasks** | 9 |
| **Polish Tasks** | 9 |
| **Parallelizable ([P])** | ~35 tasks (58%) |

### Format Validation

✅ All tasks follow the checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ All file paths are included
✅ All user story tasks are labeled (US1-US5)
✅ Setup and Foundational phases have no story labels
✅ Polish phase has no story labels

### Independent Test Criteria

| User Story | Independent Test | Validation Point |
|------------|------------------|------------------|
| US1 | Copy text → search "clip:" → press Enter → paste in another app | T009-T017 |
| US2 | Enable file search → index files → search filename → open result | T018-T026 |
| US3 | Enable browser search → search bookmark title → open in browser | T027-T036 |
| US4 | Type "#ff0000" → verify all formats → click copy | T037-T042 |
| US5 | Install plugin → type trigger → verify execution | T043-T051 |

### MVP Scope

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 17 tasks

- Delivers core value: clipboard paste (fixes broken feature)
- Fully functional and independently testable
- Foundation for all other stories
- Estimated effort: ~1-2 weeks for solo developer

### Extended MVP

**Add US2 + US3** for comprehensive search functionality: +19 tasks = 36 tasks total

- Adds file search and browser bookmark search
- Matches competing launchers (uTools, Alfred, Raycast)
- Estimated effort: ~2-3 additional weeks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
