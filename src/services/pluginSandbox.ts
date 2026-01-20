/**
 * Plugin Sandbox Service (v2)
 *
 * Provides isolated execution environment for plugins using Web Workers.
 * Features:
 * - Worker-based isolation (separate thread from main UI)
 * - Timeout protection (configurable per execution)
 * - Permission enforcement (check before API access)
 * - Crash handling (disable plugin after max crashes)
 * - Resource management (worker pool with size limits)
 * - Support for module-based plugin execution (v2 with actionData)
 */

import type { PluginPermission } from '@/lib/plugin-sdk/types';
import type { PluginSearchResultV2, PluginActionData, PluginV2 } from '@/lib/plugin-sdk/v2-types';
import { invoke } from '@tauri-apps/api/core';
import { getSandboxMonitor } from './sandboxMonitor';

// Worker message types for code-based execution
interface CodeExecuteMessage {
  type: 'execute';
  pluginId: string;
  code: string;
  args: any;
  permissions: PluginPermission[];
  timeout: number;
}

// Worker message types for module-based execution
interface ModuleExecuteMessage {
  type: 'execute';
  pluginId: string;
  pluginPath: string;
  query: string;
  permissions: PluginPermission[];
  timeout: number;
}

type ExecuteMessage = CodeExecuteMessage | ModuleExecuteMessage;

interface ModuleResultMessage {
  type: 'result';
  success: boolean;
  results: PluginSearchResultV2[];
  error?: string;
  executionTime: number;
}

interface CodeResultMessage {
  type: 'result';
  success: boolean;
  output: any;
  error?: string;
}

type ResultMessage = ModuleResultMessage | CodeResultMessage;

interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  args: any[];
  pluginId?: string;
}

interface NotificationMessage {
  type: 'notification';
  title: string;
  message: string;
}

type WorkerMessage = ResultMessage | LogMessage | NotificationMessage;

/**
 * Plugin execution result for module-based plugins (v2)
 */
export interface PluginModuleExecutionResult {
  pluginId: string;
  success: boolean;
  results: PluginSearchResultV2[];
  error?: string;
  executionTime: number;
}

/**
 * Plugin execution result for code-based plugins (v2)
 */
export interface PluginCodeExecutionResult {
  pluginId: string;
  results: PluginSearchResultV2[];
  success: boolean;
  error?: string;
  executionTime: number;
}

/**
 * Plugin execution context
 */
interface PluginExecutionContext {
  grantedPermissions: PluginPermission[];
  isEnabled: boolean;
  crashCount: number;
  lastExecutionTime?: number;
  pluginPath?: string; // For module-based plugins
}

/**
 * Worker pool entry
 */
interface WorkerPoolEntry {
  worker: Worker;
  busy: boolean;
  pluginId?: string;
}

/**
 * Plugin Sandbox Configuration
 */
interface SandboxConfig {
  maxCrashes: number;
  defaultTimeout: number;
  maxWorkers: number;
  workerKeepAlive: number; // ms to keep idle worker alive
  useIsolatedExecutor: boolean; // Use the new isolated executor
}

const DEFAULT_CONFIG: SandboxConfig = {
  maxCrashes: 3,
  defaultTimeout: 5000, // 5 seconds
  maxWorkers: 4, // Maximum concurrent workers
  workerKeepAlive: 30000, // 30 seconds
  useIsolatedExecutor: true, // Use the new isolated executor by default
};

/**
 * Plugin Sandbox Service
 *
 * Manages plugin execution in isolated Web Workers with permission checks
 * and timeout protection.
 */
export class PluginSandbox {
  private contexts: Map<string, PluginExecutionContext> = new Map();
  private workerPool: WorkerPoolEntry[] = [];
  private config: SandboxConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private monitor = getSandboxMonitor(this);

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Register a plugin in the sandbox
   *
   * @param pluginId - Plugin identifier
   * @param permissions - List of granted permissions
   * @param pluginPath - Optional path to plugin module for isolated execution
   */
  registerPlugin(
    pluginId: string,
    permissions: PluginPermission[],
    pluginPath?: string
  ): void {
    if (this.contexts.has(pluginId)) {
      console.warn(`[PluginSandbox] Plugin ${pluginId} already registered, updating permissions`);
      console.warn(`[PluginSandbox] Old pluginPath:`, this.contexts.get(pluginId)?.pluginPath);
      console.warn(`[PluginSandbox] New pluginPath:`, pluginPath);
    }

    this.contexts.set(pluginId, {
      grantedPermissions: permissions,
      isEnabled: true,
      crashCount: 0,
      pluginPath,
    });

    console.log(`[PluginSandbox] Registered plugin: ${pluginId}`, {
      permissions,
      enabled: true,
      hasModulePath: !!pluginPath,
      pluginPath,
    });

    // Reset crash count and enable plugin on registration
    // This allows plugins to recover from previous crashes when reloaded
    this.resetCrashCount(pluginId);
    this.setPluginEnabled(pluginId, true);
  }

  /**
   * Unregister a plugin from the sandbox
   */
  unregisterPlugin(pluginId: string): void {
    this.contexts.delete(pluginId);
    console.log(`[PluginSandbox] Unregistered plugin: ${pluginId}`);
  }

  /**
   * Set plugin enabled/disabled state
   *
   * @param pluginId - Plugin identifier
   * @param enabled - Whether the plugin should be enabled
   */
  setPluginEnabled(pluginId: string, enabled: boolean): void {
    console.log(`[PluginSandbox] setPluginEnabled called for ${pluginId}, enabled: ${enabled}`);
    const context = this.contexts.get(pluginId);

    if (!context) {
      console.warn(`[PluginSandbox] Cannot set enabled state for unregistered plugin: ${pluginId}`);
      console.warn(`[PluginSandbox] Available plugins:`, Array.from(this.contexts.keys()));
      return;
    }

    const oldState = context.isEnabled;
    context.isEnabled = enabled;
    console.log(`[PluginSandbox] Plugin ${pluginId} state changed: ${oldState} -> ${enabled}`);
  }

  /**
   * Get plugin context
   *
   * @param pluginId - Plugin identifier
   * @returns Plugin context or undefined
   */
  getPluginContext(pluginId: string) {
    const context = this.contexts.get(pluginId);
    console.log(`[PluginSandbox] getPluginContext for ${pluginId}:`, context ? {
      isEnabled: context.isEnabled,
      hasPath: !!context.pluginPath,
      path: context.pluginPath
    } : null);
    return context;
  }

  /**
   * Check if plugin has permission
   */
  checkPermission(pluginId: string, permission: PluginPermission): boolean {
    const context = this.contexts.get(pluginId);

    if (!context) {
      console.warn(`Plugin ${pluginId} not found in sandbox`);
      return false;
    }

    if (!context.isEnabled) {
      console.warn(`Plugin ${pluginId} is disabled`);
      return false;
    }

    return context.grantedPermissions.includes(permission);
  }

  /**
   * Execute plugin code in isolated worker
   *
   * @param pluginId - Plugin identifier
   * @param code - Plugin code to execute
   * @param args - Arguments to pass to plugin
   * @param timeout - Execution timeout in milliseconds (default: 5000)
   * @returns Execution result with timing
   */
  async executePlugin(
    pluginId: string,
    code: string,
    args: any,
    timeout?: number
  ): Promise<PluginCodeExecutionResult> {
    const startTime = performance.now();

    // Check if plugin exists and is enabled
    const context = this.contexts.get(pluginId);

    if (!context) {
      return {
        pluginId,
        success: false,
        results: [],
        error: `Plugin ${pluginId} not found in sandbox`,
        executionTime: performance.now() - startTime,
      };
    }

    if (!context.isEnabled) {
      return {
        pluginId,
        success: false,
        results: [],
        error: `Plugin ${pluginId} is disabled`,
        executionTime: performance.now() - startTime,
      };
    }

    // Get worker from pool
    const worker = await this.acquireWorker(pluginId);

    try {
      // Execute with timeout
      const result = await this.executeInWorker(
        worker,
        pluginId,
        code,
        args,
        context.grantedPermissions,
        timeout ?? this.config.defaultTimeout
      );

      const executionTime = performance.now() - startTime;

      // Update execution stats
      context.lastExecutionTime = executionTime;

      // Handle crash
      if (!result.success) {
        const disabled = this.handlePluginCrash(pluginId);

        if (disabled) {
          console.error(`[PluginSandbox] Plugin ${pluginId} disabled after too many crashes`);
          return {
            pluginId,
            success: false,
            results: [],
            error: `Plugin ${pluginId} disabled after ${this.config.maxCrashes} crashes. Original error: ${result.error}`,
            executionTime,
          };
        }
      } else {
        // Reset crash count on successful execution
        context.crashCount = 0;
      }

      return {
        ...result,
        executionTime,
      };

    } finally {
      // Release worker back to pool
      this.releaseWorker(worker);
    }
  }

  /**
   * Execute plugin module in isolated worker
   *
   * This is the NEW method that executes ES module plugins with true isolation.
   * It loads the plugin module dynamically in a Web Worker and executes its
   * onSearch function with full timeout protection and permission checks.
   *
   * @param pluginId - Plugin identifier
   * @param query - Search query to pass to onSearch
   * @param timeout - Execution timeout in milliseconds (default: 5000)
   * @returns Execution result with plugin search results
   */
  async executePluginModule(
    pluginId: string,
    query: string,
    timeout?: number
  ): Promise<PluginModuleExecutionResult> {
    const startTime = performance.now();

    // Check if plugin exists and is enabled
    const context = this.contexts.get(pluginId);

    if (!context) {
      return {
        success: false,
        results: [],
        error: `Plugin ${pluginId} not found in sandbox`,
        executionTime: performance.now() - startTime,
      };
    }

    if (!context.isEnabled) {
      return {
        success: false,
        results: [],
        error: `Plugin ${pluginId} is disabled`,
        executionTime: performance.now() - startTime,
      };
    }

    if (!context.pluginPath) {
      return {
        success: false,
        results: [],
        error: `Plugin ${pluginId} does not have a registered module path`,
        executionTime: performance.now() - startTime,
      };
    }

    // Get worker from pool
    const worker = await this.acquireWorker(pluginId);

    try {
      // Execute with timeout
      const result = await this.executeInWorker(
        worker,
        pluginId,
        context.pluginPath,
        { query },
        context.grantedPermissions,
        timeout ?? this.config.defaultTimeout
      );

      const executionTime = performance.now() - startTime;

      // Update execution stats
      context.lastExecutionTime = executionTime;

      // Record execution in monitor
      this.monitor.recordExecution(pluginId, executionTime, result.success);

      // Handle crash
      if (!result.success) {
        const disabled = this.handlePluginCrash(pluginId);

        if (disabled) {
          console.error(`[PluginSandbox] Plugin ${pluginId} disabled after too many crashes`);
          return {
            pluginId,
            success: false,
            results: [],
            error: `Plugin ${pluginId} disabled after ${this.config.maxCrashes} crashes. Original error: ${result.error}`,
            executionTime,
          };
        }
      } else {
        // Reset crash count on successful execution
        context.crashCount = 0;
      }

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      // Handle plugin exceptions
      console.error(`[PluginSandbox] Error executing ${pluginId}:`, error);
      throw error;
    } finally {
      // Release worker back to pool
      this.releaseWorker(worker);
    }
  }

  /**
   * Get sandbox metrics from monitor
   */
  getMetrics() {
    return this.monitor.getMetrics();
  }

  /**
   * Get sandbox report from monitor
   */
  getReport(): string {
    return this.monitor.getReport();
  }

  /**
   * Log sandbox report to console
   */
  logReport() {
    this.monitor.logReport();
  }

  /**
   * Execute code in a Web Worker
   */
  private executeInWorker(
    worker: Worker,
    pluginId: string,
    code: string,
    args: any,
    permissions: PluginPermission[],
    timeout: number
  ): Promise<PluginCodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      // Set up timeout
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Worker execution timeout after ${timeout}ms`));
      }, timeout + 1000); // Add buffer for worker overhead

      // Message handler
      const handler = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;

          switch (message.type) {
            case 'result':
              clearTimeout(timeoutId);
              worker.removeEventListener('message', handler);
              resolve({
                pluginId,
                results: 'results' in message ? message.results : message.output || [],
                success: message.success,
                error: message.error,
                executionTime: performance.now() - startTime,
              });
              break;

          case 'log':
            // Forward console logs
            const consoleMethod = message.level === 'error'
              ? console.error
              : message.level === 'warn'
              ? console.warn
              : console.log;
            consoleMethod(`[Plugin:${pluginId}]`, ...message.args);
            break;

          case 'notification':
            // Forward notification to backend
            invoke('send_notification', {
              title: message.title,
              body: message.message,
            }).catch(console.error);
            break;

          default:
            console.warn(`[PluginSandbox] Unknown message type:`, message);
        }
      };

      worker.addEventListener('message', handler);

      // Send execution request
      worker.postMessage({
        type: 'execute',
        pluginId,
        code,
        args,
        permissions,
        timeout,
      } as ExecuteMessage);
    });
  }

  /**
   * Execute plugin module in isolated worker using the new executor
   */
  private executeModuleInWorker(
    worker: Worker,
    pluginId: string,
    pluginPath: string,
    query: string,
    permissions: PluginPermission[],
    timeout: number
  ): Promise<PluginModuleExecutionResult> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      // Set up timeout
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Worker execution timeout after ${timeout}ms`));
      }, timeout + 1000); // Add buffer for worker overhead

      // Message handler
      const handler = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'result':
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handler);

            // Check if this is a module result or code result
            if ('results' in message) {
              resolve({
                pluginId,
                success: message.success,
                results: message.results,
                error: message.error,
                executionTime: performance.now() - startTime,
              });
            } else {
              // Code result - convert to module result format
              resolve({
                pluginId,
                success: message.success,
                results: message.output || [],
                error: message.error,
                executionTime: performance.now() - startTime,
              });
            }
            break;

          case 'log':
            // Forward console logs
            const consoleMethod = message.level === 'error'
              ? console.error
              : message.level === 'warn'
              ? console.warn
              : console.log;
            const prefix = message.pluginId ? `[Plugin:${message.pluginId}]` : `[Plugin:${pluginId}]`;
            consoleMethod(prefix, ...message.args);
            break;

          case 'notification':
            // Forward notification to backend
            invoke('send_notification', {
              title: message.title,
              body: message.message,
            }).catch(console.error);
            break;

          default:
            console.warn(`[PluginSandbox] Unknown message type:`, message);
        }
      };

      worker.addEventListener('message', handler);

      // Send execution request
      worker.postMessage({
        type: 'execute',
        pluginId,
        pluginPath,
        query,
        permissions,
        timeout,
      } as ModuleExecuteMessage);
    });
  }

  /**
   * Acquire a worker from the pool
   *
   * Optimization strategies:
   * 1. Try to find an idle worker
   * 2. If found, reuse it (fastest)
   * 3. If pool not full, create new worker
   * 4. If pool full, wait with exponential backoff
   */
  private async acquireWorker(pluginId: string): Promise<Worker> {
    // Try to find an idle worker (prefer workers that previously executed this plugin)
    let entry = this.workerPool.find(w => !w.busy && w.pluginId === pluginId);

    // If no plugin-specific worker, find any idle worker
    if (!entry) {
      entry = this.workerPool.find(w => !w.busy);
    }

    if (entry) {
      // Reuse existing worker
      console.log(`[PluginSandbox] Reusing Worker for ${pluginId}`);
      entry.busy = true;
      entry.pluginId = pluginId;
      return entry.worker;
    }

    // No idle worker available
    if (this.workerPool.length < this.config.maxWorkers) {
      // Create new worker
      console.log(`[PluginSandbox] Creating new Worker (${this.workerPool.length + 1}/${this.config.maxWorkers})`);
      const worker = this.createWorker();
      entry = { worker, busy: true, pluginId };
      this.workerPool.push(entry);
      return entry.worker;
    }

    // Pool is full, wait with exponential backoff
    const waitTime = Math.min(50 * Math.pow(2, this.workerPool.length - this.config.maxWorkers), 500);
    console.log(`[PluginSandbox] Worker pool full, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return this.acquireWorker(pluginId);
  }

  /**
   * Release a worker back to the pool
   */
  private releaseWorker(worker: Worker): void {
    const entry = this.workerPool.find(w => w.worker === worker);

    if (entry) {
      entry.busy = false;
      entry.pluginId = undefined;
    }
  }

  /**
   * Create a new Web Worker
   *
   * Uses the isolated plugin executor for true module-based isolation
   */
  private createWorker(): Worker {
    // Use the new isolated executor for module-based plugins
    const worker = new Worker(
      new URL('../workers/isolatedPluginExecutor.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle worker errors
    worker.onerror = (error) => {
      console.error('[PluginSandbox] Worker error:', error);
    };

    return worker;
  }

  /**
   * Handle plugin crash
   *
   * @returns true if plugin was disabled
   */
  handlePluginCrash(pluginId: string): boolean {
    const context = this.contexts.get(pluginId);

    if (!context) {
      return false;
    }

    context.crashCount++;

    // Disable plugin if it crashed too many times
    if (context.crashCount >= this.config.maxCrashes) {
      context.isEnabled = false;
      console.error(
        `[PluginSandbox] Plugin ${pluginId} disabled after ${context.crashCount} crashes`
      );
      return true;
    }

    console.warn(
      `[PluginSandbox] Plugin ${pluginId} crash count: ${context.crashCount}/${this.config.maxCrashes}`
    );
    return false;
  }

  /**
   * Reset crash count for a plugin
   */
  resetCrashCount(pluginId: string): void {
    const context = this.contexts.get(pluginId);

    if (context) {
      context.crashCount = 0;
      console.log(`[PluginSandbox] Reset crash count for ${pluginId}`);
    }
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string): void {
    this.setPluginEnabled(pluginId, true);
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): void {
    this.setPluginEnabled(pluginId, false);
  }

  /**
   * Grant permission to a plugin
   */
  grantPermission(pluginId: string, permission: PluginPermission): void {
    const context = this.contexts.get(pluginId);

    if (context && !context.grantedPermissions.includes(permission)) {
      context.grantedPermissions.push(permission);
      console.log(`[PluginSandbox] Granted ${permission} to ${pluginId}`);
    }
  }

  /**
   * Revoke permission from a plugin
   */
  revokePermission(pluginId: string, permission: PluginPermission): void {
    const context = this.contexts.get(pluginId);

    if (context) {
      context.grantedPermissions = context.grantedPermissions.filter(
        p => p !== permission
      );
      console.log(`[PluginSandbox] Revoked ${permission} from ${pluginId}`);
    }
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Start cleanup timer for idle workers
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      // Terminate idle workers (keep at least 1)
      while (this.workerPool.length > 1) {
        const idleEntry = this.workerPool.find(w => !w.busy);

        if (!idleEntry) {
          break;
        }

        idleEntry.worker.terminate();
        this.workerPool = this.workerPool.filter(w => w !== idleEntry);
      }
    }, this.config.workerKeepAlive);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Terminate all workers
    for (const entry of this.workerPool) {
      entry.worker.terminate();
    }

    this.workerPool = [];
    this.contexts.clear();

    console.log('[PluginSandbox] Destroyed');
  }
}

// Singleton instance
let sandboxInstance: PluginSandbox | null = null;

/**
 * Get the singleton Plugin Sandbox instance
 */
export function getPluginSandbox(config?: Partial<SandboxConfig>): PluginSandbox {
  if (!sandboxInstance) {
    sandboxInstance = new PluginSandbox(config);
  }
  return sandboxInstance;
}

/**
 * Reset the singleton (mainly for testing)
 */
export function resetPluginSandbox(): void {
  if (sandboxInstance) {
    sandboxInstance.destroy();
    sandboxInstance = null;
  }
}
