/**
 * Settings Panel Component (T183, T187)
 * User settings and preferences management with tabs
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ThemeSelector, Theme } from './ThemeSelector';
import { HotkeyEditor } from './HotkeyEditor';
import { FeatureToggle } from './FeatureToggle';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import PluginSettingsPanel from './PluginSettingsPanel';
import { AbbreviationManager } from './AbbreviationManager';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

type TabId = 'general' | 'appearance' | 'features' | 'hotkeys' | 'plugins' | 'files' | 'abbreviations';

interface AppSettings {
  startup_behavior: string;
  language: string;
  theme: Theme;
  window_opacity: number;
  show_menubar_icon: boolean;
  enable_clipboard: boolean;
  enable_file_search: boolean;
  enable_browser_search: boolean;
  search_debounce_ms: number;
  max_results: number;
  file_index_paths?: string[];
  excluded_directories?: string[];
  // ✅ 安全加固：移除 marketplace_url，使用硬编码的官方 npm registry
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<AppSettings>({
    startup_behavior: 'OnDemand',
    language: 'en',
    theme: 'system',
    window_opacity: 95,
    show_menubar_icon: true,
    enable_clipboard: true,
    enable_file_search: false,
    enable_browser_search: false,
    search_debounce_ms: 150,
    max_results: 50,
    file_index_paths: [],
    excluded_directories: ['node_modules', '.git', 'target', 'dist', 'build', '.vscode', '.idea'],
    // ✅ 安全加固：移除 marketplace_url
  });
  const [editingHotkey, setEditingHotkey] = useState(false);
  const [currentHotkey, setCurrentHotkey] = useState('Option+Space');
  const [newExcludedDir, setNewExcludedDir] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await invoke<AppSettings>('get_settings');
      setSettings(loaded);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // Convert key format for backend
      const backendKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      await invoke('set_setting', {
        key: backendKey,
        value: JSON.stringify(value),
      });
    } catch (e) {
      console.error('Failed to save setting:', e);
    }
  };

  const handleThemeChange = (theme: Theme) => {
    updateSetting('theme', theme);
  };

  const handleHotkeySave = async (hotkey: string) => {
    setCurrentHotkey(hotkey);
    setEditingHotkey(false);
    // TODO: Invoke backend to update hotkey
    console.log('New hotkey:', hotkey);
  };

  const handleFeatureToggle = async (feature: keyof AppSettings, enabled: boolean) => {
    updateSetting(feature, enabled);
  };

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel__header">
          <h2>设置</h2>
          <button className="settings-panel__close" onClick={onClose} aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs (T187) */}
        <div className="settings-panel__tabs">
            <button
              className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              通用
            </button>
            <button
              className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              外观
            </button>
            <button
              className={`settings-tab ${activeTab === 'features' ? 'active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              功能
            </button>
            <button
              className={`settings-tab ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              文件
            </button>
            <button
              className={`settings-tab ${activeTab === 'hotkeys' ? 'active' : ''}`}
              onClick={() => setActiveTab('hotkeys')}
            >
              快捷键
            </button>
            <button
              className={`settings-tab ${activeTab === 'plugins' ? 'active' : ''}`}
              onClick={() => setActiveTab('plugins')}
            >
              插件
            </button>
            <button
              className={`settings-tab ${activeTab === 'abbreviations' ? 'active' : ''}`}
              onClick={() => setActiveTab('abbreviations')}
            >
              缩写
            </button>
          </div>

        {/* Tab Content */}
        <div className="settings-panel__body">
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>通用设置</h3>

                <div className="settings-item">
                  <label htmlFor="language">语言</label>
                  <select
                    id="language"
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="zh">简体中文</option>
                  </select>
                </div>

                <div className="settings-item">
                  <label htmlFor="startup">启动行为</label>
                  <select
                    id="startup"
                    value={settings.startup_behavior}
                    onChange={(e) => updateSetting('startup_behavior', e.target.value)}
                  >
                    <option value="OnDemand">按需启动</option>
                    <option value="AutoStart">开机自启</option>
                    <option value="Minimized">启动最小化</option>
                  </select>
                </div>

                <div className="settings-item">
                  <label htmlFor="debounce">搜索延迟 (毫秒)</label>
                  <Input
                    id="debounce"
                    type="number"
                    value={settings.search_debounce_ms}
                    onChange={(e) => updateSetting('search_debounce_ms', parseInt(e.target.value) || 150)}
                  />
                </div>

                <div className="settings-item">
                  <label htmlFor="maxResults">最大结果数</label>
                  <Input
                    id="maxResults"
                    type="number"
                    value={settings.max_results}
                    onChange={(e) => updateSetting('max_results', parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>外观设置</h3>

                <div className="settings-item">
                  <label>主题</label>
                  <ThemeSelector
                    currentTheme={settings.theme}
                    onThemeChange={handleThemeChange}
                  />
                </div>

                <div className="settings-item">
                  <label htmlFor="opacity">窗口透明度 ({Math.round(settings.window_opacity * 100)}%)</label>
                  <input
                    id="opacity"
                    type="range"
                    min="80"
                    max="100"
                    value={Math.round(settings.window_opacity * 100)}
                    onChange={(e) => updateSetting('window_opacity', parseInt(e.target.value) / 100)}
                  />
                </div>

                <div className="settings-item">
                  <FeatureToggle
                    label="显示菜单栏图标"
                    checked={settings.show_menubar_icon}
                    onChange={(checked) => updateSetting('show_menubar_icon', checked)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="settings-section">
                <h3>功能设置</h3>

                <div className="settings-item">
                  <FeatureToggle
                    label="启用剪贴板历史 (T010-T017)"
                    checked={settings.enable_clipboard}
                    onChange={(checked) => updateSetting('enable_clipboard', checked)}
                  />
                  <p className="settings-hint">
                    保存剪贴板历史记录，支持搜索和重放
                  </p>
                </div>

                <div className="settings-item">
                  <FeatureToggle
                    label="启用文件搜索 (T018-T026)"
                    checked={settings.enable_file_search}
                    onChange={(checked) => updateSetting('enable_file_search', checked)}
                  />
                  <p className="settings-hint">
                    索引本地文件以快速搜索
                  </p>
                </div>

                <div className="settings-item">
                  <FeatureToggle
                    label="启用浏览器书签搜索 (T027-T036)"
                    checked={settings.enable_browser_search}
                    onChange={(checked) => updateSetting('enable_browser_search', checked)}
                  />
                  <p className="settings-hint">
                    从 Chrome/Firefox/Safari 读取书签和历史记录
                  </p>
                </div>

                <div className="settings-item">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await invoke('update_browser_cache');
                        alert('浏览器缓存已更新');
                      } catch (err) {
                        alert('更新失败: ' + (err instanceof Error ? err.message : String(err)));
                      }
                    }}
                  >
                    刷新浏览器缓存
                  </Button>
                  <p className="settings-hint">
                    手动刷新浏览器书签和历史记录缓存
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="settings-section">
                <h3>文件索引设置</h3>

                <div className="settings-item">
                  <label>排除目录 (T158)</label>
                  <div className="excluded-directories-list">
                    {settings.excluded_directories?.map((dir, index) => (
                      <div key={index} className="excluded-dir-item">
                        <span>{dir}</span>
                        <button
                          className="remove-dir-btn"
                          onClick={() => {
                            const newDirs = settings.excluded_directories?.filter((_, i) => i !== index) || [];
                            updateSetting('excluded_directories', newDirs);
                          }}
                          aria-label={`移除 ${dir}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-excluded-dir">
                    <Input
                      placeholder="输入目录名 (如: node_modules)"
                      value={newExcludedDir}
                      onChange={(e) => setNewExcludedDir(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newExcludedDir.trim()) {
                          const newDirs = [...(settings.excluded_directories || []), newExcludedDir.trim()];
                          updateSetting('excluded_directories', newDirs);
                          setNewExcludedDir('');
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (newExcludedDir.trim()) {
                          const newDirs = [...(settings.excluded_directories || []), newExcludedDir.trim()];
                          updateSetting('excluded_directories', newDirs);
                          setNewExcludedDir('');
                        }
                      }}
                      disabled={!newExcludedDir.trim()}
                    >
                      添加
                    </Button>
                  </div>
                  <p className="settings-hint">
                    这些目录将在文件索引时被自动跳过
                  </p>
                </div>

                <div className="settings-item">
                  <label>索引路径</label>
                  <div className="index-paths-list">
                    {!settings.file_index_paths || settings.file_index_paths.length === 0 ? (
                      <p className="settings-hint">未设置索引路径</p>
                    ) : (
                      settings.file_index_paths.map((path: string, index: number) => (
                        <div key={index} className="indexed-path-item">
                          <span>{path}</span>
                          <button
                            className="remove-dir-btn"
                            onClick={() => {
                              const newPaths = settings.file_index_paths?.filter((_, i) => i !== index) || [];
                              updateSetting('file_index_paths', newPaths);
                            }}
                            aria-label={`移除 ${path}`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      // TODO: Implement directory picker
                      console.log('Add index path');
                    }}
                  >
                    添加路径
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'hotkeys' && (
              <div className="settings-section">
                <h3>快捷键设置</h3>

                <div className="settings-item">
                  <label>全局快捷键</label>
                  {editingHotkey ? (
                    <HotkeyEditor
                      currentHotkey={currentHotkey}
                      onSave={handleHotkeySave}
                      onCancel={() => setEditingHotkey(false)}
                    />
                  ) : (
                    <div className="hotkey-display">
                      <kbd>{currentHotkey}</kbd>
                      <Button variant="secondary" onClick={() => setEditingHotkey(true)}>
                        修改
                      </Button>
                    </div>
                  )}
                </div>

                <div className="settings-item">
                  <p className="settings-hint">
                    提示：修改快捷键后需要重启应用才能生效
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'plugins' && (
              <div className="settings-section">
                <h3>插件设置</h3>

                {/* ✅ 安全加固：移除自定义 marketplace URL，使用硬编码的官方 npm registry */}

                <div className="settings-item">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      // ✅ 安全加固：使用硬编码的官方 npm registry URL
                      const url = 'https://www.npmjs.com/search?q=keywords:etools-plugin';
                      try {
                        await invoke('open_url', { url });
                      } catch (error) {
                        console.error('[SettingsPanel] Failed to open URL:', error);
                      }
                    }}
                  >
                    访问插件市场
                  </Button>
                  <p className="settings-hint">
                    在浏览器中打开官方 npm registry，浏览和搜索 etools 插件
                  </p>
                </div>

                <div className="settings-divider"></div>

                <div className="settings-section settings-section--full">
                  <PluginSettingsPanel />
                </div>
              </div>
            )}

            {activeTab === 'abbreviations' && (
              <div className="settings-section settings-section--full">
                <AbbreviationManager />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-panel__footer">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
