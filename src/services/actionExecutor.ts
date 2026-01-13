/**
 * Action Executor - Executes plugin actions on main thread
 *
 * This component runs on the main thread and is responsible for:
 * 1. Receiving PluginActionData from Worker
 * 2. Creating and executing action functions with access to Tauri/Browser APIs
 * 3. Handling errors and permissions
 */

import { invoke } from '@tauri-apps/api/core';
import type { PluginActionData, PluginPermission } from '@/lib/plugin-sdk/v2-types';

/**
 * Action Executor class
 */
export class ActionExecutor {
  private grantedPermissions: Set<PluginPermission>;

  constructor(permissions: PluginPermission[] = []) {
    this.grantedPermissions = new Set(permissions);
  }

  /**
   * Execute action based on actionData
   */
  async execute(actionData: PluginActionData): Promise<void> {
    console.log('[ActionExecutor] Executing action:', actionData.type, actionData);

    try {
      switch (actionData.type) {
        case 'popup':
          await this.executePopup(actionData.data?.popup || {});
          break;

        case 'clipboard':
          await this.executeClipboard(actionData.data?.clipboard || {});
          break;

        case 'open-url':
          await this.executeOpenUrl(actionData.data?.url || {});
          break;

        case 'custom':
          await this.executeCustom(actionData.data?.custom || {});
          break;

        case 'none':
          // Do nothing
          console.log('[ActionExecutor] Action type is "none", skipping execution');
          break;

        default:
          console.warn('[ActionExecutor] Unknown action type:', actionData.type);
      }
    } catch (error) {
      console.error('[ActionExecutor] Action execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute popup action
   */
  private async executePopup(data: {
    title: string;
    message: string;
    icon?: string;
    style?: 'info' | 'success' | 'warning' | 'error';
    buttons?: Array<{ label: string; value: string; isPrimary?: boolean }>;
  }): Promise<void> {
    try {
      await invoke('show_plugin_popup', {
        title: data.title,
        message: data.message,
        icon: data.icon || 'ℹ️',
        style: data.style || 'info',
        buttons: data.buttons || [{ label: '确定', value: 'ok', isPrimary: true }]
      });
    } catch (error) {
      console.error('[ActionExecutor] Failed to show Tauri popup:', error);
      // Fallback to browser alert
      alert(`${data.title}\n\n${data.message}`);
    }
  }

  /**
   * Execute clipboard action
   */
  private async executeClipboard(data: {
    text: string;
    type?: 'text' | 'image';
  }): Promise<void> {
    if (!this.checkPermission('write:clipboard')) {
      throw new Error('Permission denied: write:clipboard');
    }

    try {
      await invoke('write_clipboard_text', { text: data.text });
      console.log('[ActionExecutor] Wrote to clipboard:', data.text);
    } catch (error) {
      console.error('[ActionExecutor] Failed to write clipboard:', error);
      // Fallback to browser API
      await navigator.clipboard.writeText(data.text);
    }
  }

  /**
   * Execute open URL action
   */
  private async executeOpenUrl(data: {
    href: string;
    target?: '_self' | '_blank';
  }): Promise<void> {
    if (!this.checkPermission('network:request')) {
      throw new Error('Permission denied: network:request');
    }

    try {
      await invoke('open_url', { url: data.href });
    } catch (error) {
      console.error('[ActionExecutor] Failed to open URL via Tauri:', error);
    }
  }

  /**
   * Execute custom action
   * This allows plugins to define custom action types
   */
  private async executeCustom(data: Record<string, unknown>): Promise<void> {
    console.log('[ActionExecutor] Executing custom action:', data);
    // Custom actions can be handled by specific plugins
    // For now, this is a placeholder for future extensibility
  }

  /**
   * Check if plugin has permission
   */
  private checkPermission(permission: PluginPermission): boolean {
    return this.grantedPermissions.has(permission);
  }

  /**
   * Grant additional permissions
   */
  grantPermission(permission: PluginPermission): void {
    this.grantedPermissions.add(permission);
  }

  /**
   * Revoke permission
   */
  revokePermission(permission: PluginPermission): void {
    this.grantedPermissions.delete(permission);
  }

  /**
   * Get all granted permissions
   */
  getPermissions(): PluginPermission[] {
    return Array.from(this.grantedPermissions);
  }
}

/**
 * Create an action function from PluginActionData
 * This function can be safely passed around in the main thread
 */
export function createActionFromData(
  actionData: PluginActionData,
  executor: ActionExecutor
): () => Promise<void> {
  return async () => {
    await executor.execute(actionData);
  };
}
