import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { abbreviationService, type Abbreviation, type AbbreviationCategory, type AbbreviationConfig } from '@/services/abbreviationService';
import { usePluginDispatch } from '@/services/pluginStateStore';

interface AbbreviationManagerProps {
  onClose?: () => void;
}

export function AbbreviationManager({ onClose }: AbbreviationManagerProps) {
  const dispatch = usePluginDispatch();
  const [config, setConfig] = useState<AbbreviationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    abbr: '',
    expansion: '',
    description: '',
    category: '',
    enabled: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const loadedConfig = await abbreviationService.loadConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load abbreviation config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: AbbreviationConfig) => {
    try {
      await abbreviationService.saveConfig(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save abbreviation config:', error);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!formData.abbr || !formData.expansion) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'warning',
          title: '提示',
          message: '请填写缩写和展开内容',
          duration: 2000,
        },
      });
      return;
    }

    try {
      if (editingId) {
        await abbreviationService.updateAbbreviation(editingId, formData);
      } else {
        await abbreviationService.addAbbreviation(formData);
      }

      await loadConfig();
      resetForm();
    } catch (error) {
      console.error('Failed to save abbreviation:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '保存失败',
          message: String(error),
          duration: 0,
        },
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await abbreviationService.deleteAbbreviation(id);
      await loadConfig();
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: '删除成功',
          message: '缩写已删除',
          duration: 2000,
        },
      });
    } catch (error) {
      console.error('Failed to delete abbreviation:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '删除失败',
          message: String(error),
          duration: 0,
        },
      });
    }
  };

  const resetForm = () => {
    setFormData({
      abbr: '',
      expansion: '',
      description: '',
      category: '',
      enabled: true,
    });
    setEditingId(null);
    setIsAddingNew(false);
  };

  const startEdit = (abbr: Abbreviation) => {
    setFormData({
      abbr: abbr.abbr,
      expansion: abbr.expansion,
      description: abbr.description || '',
      category: abbr.category || '',
      enabled: abbr.enabled,
    });
    setEditingId(abbr.id);
    setIsAddingNew(true);
  };

  const exportConfig = async () => {
    try {
      const configJson = abbreviationService.exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'abbreviations.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export config:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '导出失败',
          message: String(error),
          duration: 0,
        },
      });
    }
  };

  const importConfig = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await abbreviationService.importConfig(text);
        await loadConfig();
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'success',
            title: '导入成功',
            message: '配置已导入',
            duration: 2000,
          },
        });
      } catch (error) {
        console.error('Failed to import config:', error);
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'error',
            title: '导入失败',
            message: String(error),
            duration: 0,
          },
        });
      }
    };
    input.click();
  };

  const filteredAbbreviations = config?.abbreviations.filter(abbr => {
    if (!abbr.enabled) return false;
    
    const matchesSearch = !searchQuery || 
      abbr.abbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      abbr.expansion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (abbr.description && abbr.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || abbr.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">加载配置失败</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">缩写配置</h1>
        <div className="flex gap-2">
          <Button onClick={importConfig} variant="ghost">
            导入配置
          </Button>
          <Button onClick={exportConfig} variant="ghost">
            导出配置
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="ghost">
              关闭
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="搜索缩写..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">所有分类</option>
              {config.categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <Button onClick={() => setIsAddingNew(true)}>
              添加缩写
            </Button>
          </div>

          {isAddingNew && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">
                {editingId ? '编辑缩写' : '添加缩写'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">缩写</label>
                  <Input
                    value={formData.abbr}
                    onChange={(e) => setFormData(prev => ({ ...prev, abbr: e.target.value }))}
                    placeholder="例如: gh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">展开</label>
                  <Input
                    value={formData.expansion}
                    onChange={(e) => setFormData(prev => ({ ...prev, expansion: e.target.value }))}
                    placeholder="例如: https://github.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="例如: GitHub"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">无分类</option>
                    {config.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="mr-2"
                />
                <label>启用</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddOrUpdate}>
                  {editingId ? '更新' : '添加'}
                </Button>
                <Button onClick={resetForm} variant="ghost">
                  取消
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredAbbreviations.map(abbr => {
              const category = config.categories.find(cat => cat.id === abbr.category);
              return (
                <div key={abbr.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{abbr.abbr}:</span>
                      <span className="text-blue-600">{abbr.expansion}</span>
                      {category && (
                        <Badge variant="primary">
                          {category.icon} {category.name}
                        </Badge>
                      )}
                      {!abbr.enabled && (
                        <Badge variant="error">已禁用</Badge>
                      )}
                    </div>
                    {abbr.description && (
                      <div className="text-sm text-gray-600">{abbr.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEdit(abbr)}
                      variant="ghost"
                      size="sm"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() => handleDelete(abbr.id)}
                      variant="danger"
                      size="sm"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">全局设置</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.globalEnabled}
                  onChange={async (e) => {
                    const newConfig = { ...config, globalEnabled: e.target.checked };
                    await saveConfig(newConfig);
                  }}
                  className="mr-2"
                />
                <label>启用缩写功能</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.autoOpenSingle}
                  onChange={async (e) => {
                    const newConfig = { ...config, autoOpenSingle: e.target.checked };
                    await saveConfig(newConfig);
                  }}
                  className="mr-2"
                />
                <label>自动打开唯一匹配</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.showInSearch}
                  onChange={async (e) => {
                    const newConfig = { ...config, showInSearch: e.target.checked };
                    await saveConfig(newConfig);
                  }}
                  className="mr-2"
                />
                <label>在搜索中显示</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.caseSensitive}
                  onChange={async (e) => {
                    const newConfig = { ...config, caseSensitive: e.target.checked };
                    await saveConfig(newConfig);
                  }}
                  className="mr-2"
                />
                <label>区分大小写</label>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">使用说明</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 输入缩写加冒号，如 <code>gh:</code> 来直接展开</p>
              <p>• 输入缩写部分字符来搜索相关缩写</p>
              <p>• 缩写结果具有最高优先级</p>
              <p>• 支持导入导出配置文件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}