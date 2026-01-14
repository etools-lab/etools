/**
 * Component Index
 * Central export point for all components
 */

// Main components
export { ResultList } from './ResultList';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';

// Result item components (use named exports)
export * from './SearchResultItem';
export * from './FileResultItem';
export * from './BrowserResultItem';
export * from './ClipboardResultItem';
export { ColorResultItem } from './ColorResultItem';  // T040-T041
export { default as PluginResultItem } from './PluginResultItem';
export * from './QuickActionResult';

// Settings components
export { ThemeSelector } from './ThemeSelector';
export { HotkeyEditor } from './HotkeyEditor';
export { FeatureToggle } from './FeatureToggle';
export { default as PluginSettingsPanel } from './PluginSettingsPanel';

// Modal components
export { HelpModal } from './HelpModal';
export { AboutDialog } from './AboutDialog';

// Re-export from ui subfolder
export * from './ui';
