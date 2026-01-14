/**
 * UI Consistency Demo Plugin
 * Demonstrates best practices for plugin UI that matches etools container
 */

import type { Plugin } from '@etools/plugin-sdk';
import { UIDemo } from './ui';

export const manifest = {
  id: 'ui-consistency-demo',
  name: 'UI 一致性演示',
  version: '1.0.0',
  description: '展示如何创建与 etools 主容器一致的插件 UI',
  author: 'etools',
  permissions: [],
  triggers: ['demo', 'ui:'],
  icon: '🎨',
};

export async function onSearch(query: string) {
  const lowerQuery = query.toLowerCase().trim();

  // Match demo: or ui: triggers
  if (lowerQuery.startsWith('demo:') || lowerQuery.startsWith('ui:')) {
    return [
      {
        id: 'ui-demo',
        title: '🎨 UI 一致性演示',
        description: '查看插件 UI 最佳实践示例',
        icon: '🎨',
        action: () => {
          // This would open the plugin UI in a modal/popup
          console.log('Opening UI consistency demo...');
        },
      },
    ];
  }

  return [];
}

// Export plugin with UI component
export const plugin: Plugin = {
  manifest,
  onSearch,
  ui: {
    component: UIDemo,
  },
};

export default plugin;
