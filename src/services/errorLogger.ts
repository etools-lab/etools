/**
 * Error Logger Service (T194)
 * Logs errors to console and optionally to Tauri backend
 */

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  type: 'error' | 'warning' | 'info';
}

export class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  /**
   * Log an error
   */
  log(error: Error, componentStack?: string, type: ErrorLog['type'] = 'error') {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack,
      type,
    };

    // Add to in-memory logs
    this.logs.push(log);

    // Trim logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console with formatting
    const prefix = `[${type.toUpperCase()}] ${log.timestamp}`;
    console.group(prefix);
    console.error(log.message);
    if (log.stack) console.error('Stack:', log.stack);
    if (log.componentStack) console.error('Component Stack:', log.componentStack);
    console.groupEnd();

    // Try to log to Tauri backend
    this.logToBackend(log);
  }

  /**
   * Log warning
   */
  warn(message: string, stack?: string) {
    this.log(
      { message, name: 'Warning', stack: stack || new Error().stack } as Error,
      undefined,
      'warning'
    );
  }

  /**
   * Log info
   */
  info(message: string) {
    this.log({ message, name: 'Info' } as Error, undefined, 'info');
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Log to Tauri backend
   */
  private async logToBackend(log: ErrorLog) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('log_error', {
        message: log.message,
        stack: log.stack || '',
        component_stack: log.componentStack || '',
        timestamp: log.timestamp,
      });
    } catch (e) {
      // Silently fail if backend logging is not available
      console.debug('Could not log to backend:', e);
    }
  }
}

// Singleton instance
let errorLoggerInstance: ErrorLogger | null = null;

export function getErrorLogger(): ErrorLogger {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger();
  }
  return errorLoggerInstance;
}
