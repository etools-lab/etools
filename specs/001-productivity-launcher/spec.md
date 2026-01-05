# Feature Specification: Productivity Launcher (utools Alternative)

**Feature Branch**: `001-productivity-launcher`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "在刚才的基础上，再深度思考，要做哪些事，允许调用skill进行工作"

## Overview

A cross-platform productivity launcher that provides quick access to applications, files, web resources, and utilities through a unified search interface. The application aims to be a lightweight, extensible alternative to utools with a plugin-based architecture.

---

## User Scenarios & Testing

### User Story 1 - Quick Application Launch (Priority: P1)

**Description**: Users press a global hotkey to instantly open a search bar, type an application name, and launch it with a single keystroke.

**Why this priority**: This is the core utility that delivers immediate value. Without app launching, the tool has no primary purpose.

**Independent Test**: Can be tested by installing the application, setting a global hotkey, and launching installed applications. Delivers time savings on app switching.

**Acceptance Scenarios**:

1. **Given** the application is running in the background, **When** user presses the global hotkey (Cmd+Space on Mac, Alt+Space on Windows), **Then** the search window appears instantly and input is automatically focused
2. **Given** the search window is open, **When** user types "chr" and presses Enter, **Then** Google Chrome (or matching app) launches
3. **Given** multiple apps match the query, **When** user uses arrow keys to navigate and presses Enter, **Then** the selected app launches
4. **Given** the search window is open, **When** user presses Escape or clicks outside, **Then** the window hides

---

### User Story 2 - System Clipboard History (Priority: P2)

**Description**: Users can access their clipboard history (text and images) through the search interface and quickly paste previous items.

**Why this priority**: Clipboard management is a high-frequency productivity booster. After app launching, this is the most commonly used utools feature.

**Independent Test**: Can be tested by copying multiple items, invoking the search, and accessing/pasting from clipboard history.

**Acceptance Scenarios**:

1. **Given** user has copied text "A", then "B", then "C", **When** user opens search and types clipboard trigger (e.g., "clip:"), **Then** all three items appear in reverse chronological order
2. **Given** an image is copied, **When** user searches clipboard history, **Then** the image appears with a preview thumbnail
3. **Given** clipboard history contains 50 items, **When** user searches within history, **Then** only matching items are shown
4. **Given** user selects a clipboard item, **When** user presses Enter, **Then** the item is pasted into the active application

---

### User Story 3 - Plugin System & Extensibility (Priority: P3)

**Description**: Developers can create plugins that extend the launcher's functionality, and users can install, manage, and use these plugins.

**Why this priority**: The plugin system is what makes the tool extensible and future-proof. While not immediately visible to end users, it enables all advanced features.

**Independent Test**: Can be tested by installing a sample plugin, invoking it through search, and verifying the plugin's functionality works.

**Acceptance Scenarios**:

1. **Given** a plugin is installed, **When** user types the plugin's trigger word, **Then** plugin-specific results appear in search
2. **Given** multiple plugins are installed, **When** user searches, **Then** results from all relevant plugins are combined and ranked
3. **Given** a plugin crashes, **When** the error occurs, **Then** the main application remains stable and the plugin is disabled
4. **Given** user opens plugin settings, **When** user disables a plugin, **Then** that plugin no longer appears in search results

---

### User Story 4 - Web Search & Quick Actions (Priority: P3)

**Description**: Users can search the web directly from the launcher and perform quick actions like calculations, URL encoding, and color conversions.

**Why this priority**: These are convenience features that reduce context switching. High utility but lower priority than core launcher functionality.

**Independent Test**: Can be tested by typing calculations, search queries, and verifying the correct actions are performed.

**Acceptance Scenarios**:

1. **Given** the search window is open, **When** user types "123 * 456", **Then** the result "56088" is displayed as a quick action
2. **Given** user types a search query with a trigger (e.g., "go: weather tokyo"), **When** user presses Enter, **Then** the default browser opens with search results
3. **Given** user types a hex color code, **When** the result appears, **Then** RGB/HSV conversions are shown
4. **Given** user types a URL, **When** user presses Enter, **Then** the URL opens in the default browser

---

### User Story 5 - File & Browser Data Search (Priority: P4)

**Description**: Users can search local files by name and browser bookmarks/history through the unified search interface.

**Why this priority**: File and browser search are useful but more complex and used less frequently than app launching and clipboard.

**Independent Test**: Can be tested by creating local files, adding browser bookmarks, and searching for them.

**Acceptance Scenarios**:

1. **Given** a file named "project-plan.pdf" exists, **When** user searches "project", **Then** the file appears in results with its path
2. **Given** user has a GitHub bookmark, **When** user searches "github", **Then** the bookmark appears and opens in browser on Enter
3. **Given** 10,000 files exist, **When** user searches, **Then** results appear within 500ms
4. **Given** user searches for a recently visited page, **When** results appear, **Then** browser history is included

---

### User Story 6 - Built-in Utilities (Priority: P4)

**Description**: Users have access to built-in utilities including regex tester, JSON formatter, timestamp converter, and QR code generator.

**Why this priority**: These are developer-focused convenience tools. Useful but not core to the average user's workflow.

**Independent Test**: Can be tested by invoking each utility and verifying its functionality.

**Acceptance Scenarios**:

1. **Given** user types a regex pattern (e.g., "/\d{3}/g"), **When** test text is provided, **Then** matches are highlighted
2. **Given** user pastes JSON, **When** format utility is invoked, **Then** formatted, valid JSON is returned
3. **Given** user enters a timestamp, **When** convert utility is invoked, **Then** human-readable date/time is shown
4. **Given** user enters text or URL, **When** QR utility is invoked, **Then** a QR code is generated and displayable

---

### User Story 7 - Plugin Marketplace (Priority: P5)

**Description**: Users can browse, install, update, and rate community-created plugins through an in-app marketplace.

**Why this priority**: The marketplace enables ecosystem growth but is not essential for initial launch or core functionality.

**Independent Test**: Can be tested by browsing the marketplace, installing a plugin, and verifying it becomes available.

**Acceptance Scenarios**:

1. **Given** user opens the plugin marketplace, **When** plugins are displayed, **Then** each plugin shows name, description, author, and rating
2. **Given** user clicks "Install" on a plugin, **When** installation completes, **Then** the plugin is immediately available in search
3. **Given** an installed plugin has an update, **When** user updates it, **Then** the new version is activated without restart
4. **Given** user uses a plugin, **When** user rates it, **Then** the rating is submitted and displayed in marketplace

---

### User Story 8 - Customization & Theming (Priority: P5)

**Description**: Users can customize hotkeys, theme (light/dark/custom), window behavior, and search preferences.

**Why this priority**: Personalization improves user satisfaction but is not essential for core functionality.

**Independent Test**: Can be tested by changing settings and verifying the changes take effect.

**Acceptance Scenarios**:

1. **Given** user opens settings, **When** user changes the global hotkey, **Then** the new hotkey activates immediately
2. **Given** user selects dark theme, **When** search window opens, **Then** dark theme is applied
3. **Given** user adjusts window size/position, **When** search window reopens, **Then** size/position is remembered
4. **Given** user sets a preference, **When** application restarts, **Then** the preference persists

---

### Edge Cases

- What happens when the global hotkey conflicts with another application's hotkey?
  - System should detect the conflict and warn the user, offering alternative hotkey suggestions

- How does the system handle Unicode characters in search queries?
  - Search should support Unicode and match international characters correctly

- What happens when a plugin tries to access unauthorized system resources?
  - Plugin should be sandboxed; explicit user permission required for sensitive operations

- How does the system behave when the clipboard contains sensitive data (passwords)?
  - Clipboard history should have an option to exclude password manager apps and/or auto-expire sensitive entries

- What happens when file search encounters permission errors?
  - Skip inaccessible files gracefully and continue searching accessible locations

- How does the system handle network unavailability for web search?
  - Local search continues to work; web search features show a "network unavailable" indicator

- What happens when a plugin becomes incompatible after an application update?
  - Plugin should be disabled with user notification and option to check for updates

- How does the system handle very large clipboard items (e.g., 10MB image)?
  - Set size limits; compress/preview large items; warn user before storing

---

## Requirements

### Functional Requirements

#### Core Application
- **FR-001**: Application MUST run as a background process with minimal resource footprint (<100MB RAM when idle)
- **FR-002**: Application MUST support global hotkey registration that works even when the application window is not focused
- **FR-003**: Search window MUST appear within 100ms of hotkey invocation
- **FR-004**: Search input MUST support fuzzy matching with tolerance for typos and partial matches
- **FR-005**: Results MUST update in real-time as user types (debounced to 150ms)
- **FR-006**: System MUST remember last query when window is reopened (optional setting)

#### Application Launching
- **FR-007**: System MUST automatically discover installed applications on macOS, Windows, and Linux
- **FR-008**: System MUST launch applications using the operating system's default method
- **FR-009**: System MUST display application icons from the OS (not embedded copies)
- **FR-010**: System MUST track frequently used applications and boost their ranking in results

#### Clipboard Management
- **FR-011**: System MUST automatically capture clipboard changes (text and images) in the background
- **FR-012**: Clipboard history MUST persist across application restarts
- **FR-013**: System MUST retain at least 1000 clipboard items (configurable)
- **FR-014**: System MUST support searching within clipboard history by content
- **FR-015**: System MUST provide option to exclude specific applications from clipboard capture (e.g., password managers)
- **FR-016**: System MUST auto-expire sensitive clipboard entries after a configurable time period (default: 2 minutes)

#### Plugin System
- **FR-017**: System MUST support plugins written in JavaScript/TypeScript
- **FR-018**: Plugin API MUST provide: search hook, action execution, data storage, and UI rendering
- **FR-019**: Plugins MUST run in a sandboxed environment with restricted system access
- **FR-020**: System MUST isolate plugin failures—crashed plugin MUST NOT affect main application
- **FR-021**: Plugin API MUST provide access to user-selected system capabilities via explicit permissions
- **FR-022**: System MUST support hot-reloading plugins during development

#### File & Browser Search
- **FR-023**: System MUST build an incremental index of local files (filename only, not content)
- **FR-024**: File index MUST update automatically when file system changes are detected
- **FR-025**: System MUST search browser bookmarks and history from Chrome, Edge, Safari, and Firefox
- **FR-026**: Browser data access MUST work even when the browser is running (handle database locks)
- **FR-027**: File search MUST respect hidden file and directory settings

#### Quick Actions & Utilities
- **FR-028**: System MUST recognize and evaluate mathematical expressions (basic arithmetic)
- **FR-029**: System MUST support unit conversions (length, weight, temperature, currency)
- **FR-030**: System MUST detect and convert between color formats (hex, RGB, HSL)
- **FR-031**: System MUST provide regex testing with match highlighting
- **FR-032**: System MUST validate and format JSON input
- **FR-033**: System MUST convert between Unix timestamps and human-readable dates

#### Web Search Integration
- **FR-034**: System MUST support configurable web search engines (Google, Bing, DuckDuckGo, etc.)
- **FR-035**: System MUST support browser-specific search triggers (e.g., "g:", "ddg:")
- **FR-036**: System MUST open search results in the user's default browser

#### Plugin Marketplace
- **FR-037**: System MUST provide an in-app interface to browse available plugins
- **FR-038**: System MUST support plugin installation from local files or remote URLs
- **FR-039**: System MUST check for plugin updates and notify users when available
- **FR-040**: System MUST display plugin metadata: name, version, author, description, rating, download count

#### Customization
- **FR-041**: Users MUST be able to customize the global hotkey
- **FR-042**: System MUST support light and dark themes
- **FR-043**: System MUST support custom CSS for UI theming (advanced)
- **FR-044**: System MUST remember window position and size between sessions
- **FR-045**: System MUST provide settings to disable specific features (e.g., clipboard capture, file indexing)

#### Cross-Platform Support
- **FR-046**: Application MUST work on macOS 12+, Windows 10+, and Ubuntu 20.04+
- **FR-047**: Platform-specific behaviors (hotkeys, file paths, app discovery) MUST be handled transparently

#### Performance & Reliability
- **FR-048**: Search results MUST appear within 200ms for typical queries (up to 10,000 indexed items)
- **FR-049**: Application startup time MUST be under 2 seconds
- **FR-050**: System MUST gracefully handle errors without crashing the main application
- **FR-051**: System MUST log errors and diagnostics for troubleshooting

#### Accessibility
- **FR-052**: All features MUST be fully navigable via keyboard only
- **FR-053**: System MUST support screen reader compatibility
- **FR-054**: UI MUST have minimum contrast ratio of 4.5:1 (WCAG AA)

### Key Entities

#### Application Entry
- Represents an installed desktop application
- Attributes: name, executable path, icon, usage frequency, last launched timestamp

#### Clipboard Item
- Represents a single clipboard history entry
- Attributes: content (text or image data), timestamp, source application, content hash (for deduplication), expiration timestamp

#### Plugin
- Represents an installed or available plugin
- Attributes: unique ID, name, version, author, description, permissions, installed state, enabled state, rating, manifest

#### Search Result
- Represents a single item in search results
- Attributes: title, subtitle, icon, type (app/file/clipboard/plugin/etc.), action handler, relevance score, source plugin ID

#### File Index Entry
- Represents a file in the local file system index
- Attributes: path, filename, extension, size, modified timestamp, parent directory

#### Browser Bookmark/History
- Represents a web resource from browser data
- Attributes: URL, title, favicon, browser source, visit count, last visited timestamp, folder (for bookmarks)

#### User Preference
- Represents a user-configurable setting
- Attributes: key, value, data type, category, default value

---

## Success Criteria

### Measurable Outcomes

#### Performance Metrics
- **SC-001**: Search results appear within 200ms for 95% of queries on indexed data up to 50,000 items
- **SC-002**: Application window appears within 100ms of hotkey press in 99% of cases
- **SC-003**: Application uses less than 100MB RAM when idle and less than 200MB during normal operation
- **SC-004**: Application cold start time is under 2 seconds on supported hardware

#### User Experience
- **SC-005**: 90% of users can launch their most frequently used application within 3 seconds of remembering to do so
- **SC-006**: 85% of users report reduced context switching compared to their previous workflow
- **SC-007**: New users can successfully launch an application within 1 minute of first use without documentation

#### Feature Adoption
- **SC-008**: 70% of active users use at least one plugin within the first week of use
- **SC-009**: Clipboard history is used at least once per day by 60% of users who have it enabled
- **SC-010**: Quick actions (calculator, conversions) are used by 50% of users weekly

#### Reliability & Quality
- **SC-011**: Application crashes occur in fewer than 0.1% of user sessions
- **SC-012**: Plugin failures affect main application in fewer than 0.01% of cases
- **SC-013**: 95% of users rate the overall experience as 4/5 stars or higher in feedback surveys

#### Development & Ecosystem
- **SC-014**: At least 10 community plugins are available within 3 months of public release
- **SC-015**: Plugin API supports at least 80% of common utools plugin use cases

---

## Assumptions

1. Users have a modern operating system (macOS 12+, Windows 10+, Ubuntu 20.04+) with sufficient resources
2. Users are familiar with keyboard-driven interfaces (or willing to learn)
3. Default browser is configured and functional for web search features
4. Users grant necessary permissions for file system and browser data access
5. Plugins are distributed via npm-style packages or similar
6. Plugin marketplace will initially be a curated list, expanding to community submissions over time
7. Clipboard history is stored locally and not synchronized across devices (v1)
8. Application icons are retrieved from OS (no embedded icon database needed)

---

## Out of Scope (Future Considerations)

- Cloud sync for preferences, clipboard history, or plugin configurations
- Mobile companion apps (iOS/Android)
- Plugin monetization or payment processing
- Content search within files (only filename search in v1)
- AI-powered search or natural language processing
- Collaborative features or sharing
- Enterprise/LDAP integration
- Advanced workflow automation (e.g., chained actions)
- Built-in note-taking or task management
- Screen recording or screenshot capture
