/**
 * Centralized icon mappings for the application
 */

/**
 * File extension to icon mapping
 */
const FILE_ICON_MAP: Record<string, string> = {
  // Code - TypeScript/JavaScript
  'ts': '📘',
  'tsx': '📘',
  'js': '📒',
  'jsx': '📒',
  'mjs': '📒',
  'cjs': '📒',

  // Code - Other languages
  'py': '🐍',
  'rs': '🦀',
  'go': '🐹',
  'java': '☕',
  'kt': '☕',
  'cpp': '⚙️',
  'c': '⚙️',
  'h': '⚙️',
  'hpp': '⚙️',
  'cs': '🔷',
  'rb': '💎',
  'php': '🐘',
  'swift': '🍎',

  // Web
  'html': '🌐',
  'htm': '🌐',
  'css': '🎨',
  'scss': '🎨',
  'sass': '🎨',
  'less': '🎨',

  // Data/Config
  'json': '📋',
  'xml': '📋',
  'yaml': '📋',
  'yml': '📋',
  'toml': '📋',
  'ini': '📋',
  'env': '🔐',

  // Documents
  'md': '📝',
  'mdx': '📝',
  'txt': '📄',
  'rtf': '📄',
  'pdf': '📕',
  'doc': '📘',
  'docx': '📘',
  'xls': '📗',
  'xlsx': '📗',
  'ppt': '📙',
  'pptx': '📙',

  // Images
  'png': '🖼️',
  'jpg': '🖼️',
  'jpeg': '🖼️',
  'gif': '🖼️',
  'svg': '🖼️',
  'webp': '🖼️',
  'ico': '🖼️',
  'bmp': '🖼️',

  // Audio
  'mp3': '🎵',
  'wav': '🎵',
  'flac': '🎵',
  'ogg': '🎵',
  'm4a': '🎵',
  'aac': '🎵',

  // Video
  'mp4': '🎬',
  'mkv': '🎬',
  'avi': '🎬',
  'mov': '🎬',
  'webm': '🎬',
  'wmv': '🎬',

  // Archives
  'zip': '📦',
  'rar': '📦',
  '7z': '📦',
  'tar': '📦',
  'gz': '📦',
  'bz2': '📦',

  // Executables
  'exe': '⚡',
  'app': '⚡',
  'dmg': '💿',
  'pkg': '💿',
  'deb': '💿',

  // Shell/Scripts
  'sh': '🖥️',
  'bash': '🖥️',
  'zsh': '🖥️',
  'fish': '🖥️',
  'ps1': '🖥️',
  'bat': '🖥️',
  'cmd': '🖥️',
};

/**
 * Browser name to icon mapping
 */
const BROWSER_ICON_MAP: Record<string, string> = {
  'chrome': '🌐',
  'firefox': '🦊',
  'safari': '🧭',
  'edge': '📘',
  'brave': '🦁',
  'opera': '🎭',
  'vivaldi': '🎨',
  'arc': '🌈',
};

/**
 * Search result type to icon mapping
 */
const RESULT_TYPE_ICON_MAP: Record<string, string> = {
  'app': '📱',
  'file': '📄',
  'clipboard': '📋',
  'bookmark': '⭐',
  'history': '🕐',
  'plugin': '🔌',
  'action': '⚡',
  'url': '🔗',
  'color': '🎨',
};

/**
 * Get icon for a file extension
 * @param extension - File extension (with or without leading dot)
 * @returns Emoji icon for the file type
 */
export function getFileIcon(extension?: string): string {
  if (!extension) return '📄';

  const ext = extension.toLowerCase().replace(/^\./, '');
  return FILE_ICON_MAP[ext] || '📄';
}

/**
 * Get icon for a browser
 * @param browser - Browser name
 * @returns Emoji icon for the browser
 */
export function getBrowserIcon(browser: string): string {
  return BROWSER_ICON_MAP[browser.toLowerCase()] || '🌐';
}

/**
 * Get icon for a search result type
 * @param type - Result type
 * @returns Emoji icon for the result type
 */
export function getResultTypeIcon(type: string): string {
  return RESULT_TYPE_ICON_MAP[type] || '•';
}

// Export maps for direct access if needed
export { FILE_ICON_MAP, BROWSER_ICON_MAP, RESULT_TYPE_ICON_MAP };
