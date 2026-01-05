# 插件管理系统文档

## 概述

Kaka 插件管理系统允许用户通过拖拽安装、管理和卸载插件。系统提供完整的插件生命周期管理,包括安装、启用、禁用和卸载功能。

## 功能特性

### 1. 插件安装 (US1)

#### 拖拽安装
- **支持格式**: `.zip`, `.tar.gz`
- **最大文件大小**: 50MB
- **安装流程**:
  1. 验证插件包格式
  2. 解压插件文件
  3. 验证插件清单 (manifest)
  4. 安装插件到系统
  5. 默认禁用状态

#### 组件
- `DragDropZone`: 拖拽区域组件
- `PluginInstaller`: 安装界面组件
- `usePluginInstaller`: 安装逻辑 Hook

### 2. 插件管理界面 (US2)

#### 功能
- 查看已安装插件列表
- 搜索插件 (按名称、描述、ID)
- 状态过滤 (全部、已启用、已禁用)
- 健康状态指示器
- 使用统计显示

#### 组件
- `PluginList`: 插件列表组件
- `PluginListItem`: 单个插件项组件
- `InstalledPluginsView`: 已安装插件视图
- `BulkActionsToolbar`: 批量操作工具栏

### 3. 启用/禁用功能 (US3)

#### 功能
- 一键启用/禁用插件
- 禁用确认对话框
- 状态实时更新
- 健康检查更新

#### 组件
- `ConfirmDisableDialog`: 禁用确认对话框

### 4. 卸载功能 (US4)

#### 功能
- 卸载插件
- 核心插件保护
- 卸载确认对话框
- 完整清理文件和配置

#### 组件
- `ConfirmUninstallDialog`: 卸载确认对话框

### 5. 错误处理和用户反馈 (T053)

#### 错误类型
系统提供全面的错误处理:

- `PluginNotFound`: 插件不存在
- `InvalidPackage`: 无效的插件包
- `InstallationFailed`: 安装失败
- `ValidationFailed`: 验证失败
- `PermissionDenied`: 权限被拒绝
- `CorePluginProtected`: 核心插件受保护
- `AlreadyInstalled`: 插件已安装
- `DependenciesNotMet`: 依赖未满足
- `FileSystemError`: 文件系统错误
- `StateError`: 状态错误
- `NetworkError`: 网络错误

#### 错误消息
所有错误消息都是中文,并提供:
- 用户友好的错误描述
- 错误代码用于程序化处理
- 建议的解决步骤

### 6. 性能监控 (T055)

#### 性能指标
系统追踪以下性能指标:

- 操作持续时间
- 成功/失败操作统计
- 平均/最小/最大执行时间
- 慢操作追踪 (>100ms)
- 插件级性能统计

#### 服务
- `PluginPerformanceMonitor`: 性能监控服务
- `OperationTimer`: 操作计时器

### 7. 安全验证 (T056, T064)

#### 安全检查

**权限验证**
- 检查权限组合风险
- 检测过多危险权限
- 权限白名单机制

**关键词检测**
- 检测敏感关键词 (password, token, 等)
- 检测可疑关键词 (malware, hack, 等)

**完整性验证**
- 作者信息验证
- 版本号模式验证
- 描述完整性检查

**安全评分**
- 0-100 分的安全评分系统
- 基于权限和元数据计算
- 帮助用户快速评估插件安全性

## 技术架构

### 前端 (React + TypeScript)

```
src/
├── components/
│   └── PluginManager/
│       ├── PluginManager.tsx          # 主管理器
│       ├── PluginInstaller.tsx         # 安装界面
│       ├── PluginList.tsx             # 插件列表
│       ├── PluginListItem.tsx          # 插件项
│       ├── InstalledPluginsView.tsx    # 已安装视图
│       ├── ConfirmDisableDialog.tsx    # 禁用确认
│       ├── ConfirmUninstallDialog.tsx  # 卸载确认
│       └── NotificationSystem.tsx      # 通知系统
├── hooks/
│   ├── usePluginInstaller.ts           # 安装 Hook
│   └── usePluginState.ts              # 状态 Hook
├── services/
│   ├── pluginManager.ts               # 插件管理服务
│   └── pluginStateStore.ts            # 状态存储
└── types/
    └── plugin.ts                      # 类型定义
```

### 后端 (Rust + Tauri)

```
src-tauri/src/
├── cmds/
│   └── plugins.rs                     # Tauri 命令
├── services/
│   ├── plugin_installer.rs            # 安装服务
│   ├── plugin_validator.rs            # 验证服务
│   ├── plugin_errors.rs               # 错误处理
│   └── plugin_performance.rs          # 性能监控
├── models/
│   └── plugin.rs                      # 数据模型
└── db/
    └── plugin_schema.rs               # 数据库架构
```

### Tauri 命令

#### 插件列表
- `plugin_list`: 获取所有已安装插件

#### 插件安装
- `plugin_validate_package_from_buffer`: 从缓冲区验证包
- `plugin_extract_package_from_buffer`: 从缓冲区解压包
- `plugin_install_from_buffer`: 从缓冲区安装

#### 插件管理
- `plugin_enable`: 启用插件
- `plugin_disable`: 禁用插件
- `plugin_uninstall`: 卸载插件

## 数据模型

### PluginManifest
```rust
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub permissions: Vec<String>,
    pub entry: String,
    pub triggers: Vec<PluginTrigger>,
}
```

### Plugin
```rust
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub enabled: bool,
    pub permissions: Vec<String>,
    pub entry_point: String,
    pub triggers: Vec<PluginTrigger>,
    pub settings: HashMap<String, serde_json::Value>,
    pub health: PluginHealth,
    pub usage_stats: PluginUsageStats,
    pub installed_at: i64,
    pub install_path: String,
    pub source: PluginSource,
}
```

## 使用示例

### 安装插件

```typescript
import { usePluginInstaller } from '@/hooks/usePluginInstaller';

function MyComponent() {
  const { installFromFile, isInstalling, progress, error } = usePluginInstaller();

  const handleFileDrop = async (file: File) => {
    const success = await installFromFile(file);
    if (success) {
      console.log('插件安装成功!');
    }
  };

  return (
    <DragDropZone onDrop={handleFileDrop} />
  );
}
```

### 管理插件

```typescript
import { pluginManagerService } from '@/services/pluginManager';

// 启用插件
await pluginManagerService.enablePlugin('plugin-id');

// 禁用插件
await pluginManagerService.disablePlugin('plugin-id');

// 卸载插件
await pluginManagerService.uninstallPlugin('plugin-id');
```

## 安全考虑

### 权限系统
- 白名单机制: 只允许预定义的权限
- 权限组合检查: 检测危险的权限组合
- 用户确认: 高风险权限需要用户明确授权

### 验证流程
- 格式验证: 检查插件包格式
- 清单验证: 验证必需字段
- 安全检查: 检测可疑模式
- 完整性验证: 验证插件元数据

### 核心插件保护
- 核心插件 (`core`, `system`) 不能被卸载
- 核心插件修改需要额外确认

## 性能优化

### 前端优化
- React.memo: 防止不必要的重渲染
- 防抖搜索: 300ms 防抖延迟
- 虚拟滚动: 处理大量插件

### 后端优化
- 异步操作: 所有文件操作异步化
- 缓存机制: 插件列表缓存
- 索引优化: 数据库查询索引

## 故障排除

### 常见问题

**Q: 插件安装失败**
A: 检查:
1. 文件格式是否正确 (.zip 或 .tar.gz)
2. 文件大小是否超过限制 (50MB)
3. plugin.json 是否存在且格式正确
4. 查看错误消息获取详细信息

**Q: 插件启用后不工作**
A: 检查:
1. 插件权限是否已授予
2. 插件健康状态
3. 查看插件日志

**Q: 无法卸载插件**
A: 检查:
1. 是否是核心插件 (核心插件受保护)
2. 插件文件是否被其他进程占用
3. 文件系统权限

## 未来改进

- [ ] 插件市场集成
- [ ] 自动更新功能
- [ ] 插件依赖管理
- [ ] 插件沙箱增强
- [ ] 国际化支持
- [ ] 插件评分系统

## 贡献指南

如需贡献插件或改进插件管理系统,请参考:
1. 代码规范: 遵循项目 ESLint 和 Rust fmt 规范
2. 测试: 添加单元测试和 E2E 测试
3. 文档: 更新相关文档
4. 安全: 遵循安全最佳实践

## 许可证

遵循项目主许可证。
