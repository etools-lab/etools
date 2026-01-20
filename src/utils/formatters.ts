/**
 * Utility functions for formatting values
 */

/**
 * Format a timestamp as relative time (e.g., "刚刚", "5 分钟前", "3 天前")
 *
 * @param timestamp - Unix timestamp (milliseconds by default, or seconds if isSeconds=true)
 * @param options - Formatting options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  timestamp: number | null | undefined,
  options: {
    /** If true, timestamp is in seconds (will be converted to ms) */
    isSeconds?: boolean;
    /** String to return when timestamp is null/undefined */
    emptyText?: string;
    /** Include "今天" and "昨天" instead of hours */
    useDayLabels?: boolean;
    /** Include weeks in output */
    includeWeeks?: boolean;
  } = {}
): string {
  const {
    isSeconds = false,
    emptyText = '',
    useDayLabels = false,
    includeWeeks = false,
  } = options;

  if (timestamp === null || timestamp === undefined) {
    return emptyText;
  }

  const ms = isSeconds ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return '刚刚';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }

  // Less than 1 day
  if (diff < 86400000) {
    if (useDayLabels) {
      return '今天';
    }
    return `${Math.floor(diff / 3600000)} 小时前`;
  }

  // Calculate days
  const diffDays = Math.floor(diff / 86400000);

  // Yesterday (only if useDayLabels)
  if (useDayLabels && diffDays ===1) {
    return '昨天';
  }

  // Less than 1 week
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }

  // Less than 1 month (with weeks)
  if (includeWeeks && diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`;
  }

  // Fallback to date string
  return date.toLocaleDateString('zh-CN');
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Format a number with thousand separators
 *
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}
