/**
 * SettingsView - 设置视图
 * 单窗口架构下的设置界面
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BackButton } from '../BackButton';
import { HotkeySettingsPanel } from '../HotkeySettingsPanel';
import PluginManager from '../PluginManager/PluginManager';

type SettingsTab = 'plugins' | 'hotkeys';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('plugins'); // 默认显示插件 tab
  const [isPluginTabMounted, setIsPluginTabMounted] = useState(true); // 默认挂载插件 tab

  const handleTabClick = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);

    // 只有当切换到插件 tab 时，才挂载 PluginManager
    if (tab === 'plugins' && !isPluginTabMounted) {
      setIsPluginTabMounted(true);
    }
  }, [isPluginTabMounted]);

  return (
    <div className="settings-window">
      <div className="settings-header">
        <BackButton />
        <h2>设置</h2>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'plugins' ? 'active' : ''}`}
          onClick={() => handleTabClick('plugins')}
        >
          插件
        </button>
        <button
          className={`settings-tab ${activeTab === 'hotkeys' ? 'active' : ''}`}
          onClick={() => handleTabClick('hotkeys')}
        >
          热键
        </button>
      </div>

      <div className="settings-content">
        <div
          className="settings-section settings-section--full"
          style={{
            display: activeTab === 'plugins' ? 'block' : 'none'
          }}
          inert={activeTab !== 'plugins'}
        >
          {/* 只有当用户切换到插件 tab 时才挂载 PluginManager */}
          {isPluginTabMounted && (
            <PluginManager
              showMarketplace={true}
              initialView="installed"
            />
          )}
        </div>
        <div
          className="settings-section settings-section--full"
          style={{
            display: activeTab === 'hotkeys' ? 'block' : 'none'
          }}
          inert={activeTab !== 'hotkeys'}
        >
          <HotkeySettingsPanel />
        </div>
      </div>
    </div>
  );
}
