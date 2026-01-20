# 文档索引

## 快速导航

- [应用文档](#应用文档)
- [插件开发文档](#插件开发文档)
- [架构文档](#架构文档)
- [项目文档](#项目文档)

---

## 应用文档

| 文档 | 说明 | 链接 |
|------|------|------|
| 用户指南 | 如何使用 etools 的各种功能 | [README](./README.md) |
| 快捷键 | 全局快捷键和操作指南 | [README#快捷键](./README.md#快捷键) |
| 配置说明 | 主题设置、搜索配置等 | [README#配置说明](./README.md#配置说明) |
| 常见问题 | FAQ 和问题排查 | [README#常见问题](./README.md#常见问题) |

---

## 插件开发文档

### 核心文档

| 文档 | 说明 | 适用人群 | 链接 |
|------|------|---------|------|
| **插件开发完整指南** | 从零开始开发插件，包含完整流程、示例代码、调试技巧 | 所有插件开发者 | [🛠️ 开发指南](./NPM_PLUGIN_DEV_GUIDE.md) |
| **NPM 插件规范** | 插件包结构、manifest 规范、字段定义 | 需要了解规范的开发者 | [📦 规范文档](./NPM_PLUGIN_SPEC.md) |
| **插件 UI 开发指南** | UI 组件库、设计令牌、最佳实践 | 开发带 UI 的插件 | [🎨 UI 指南](./PLUGIN_UI_GUIDE.md) |
| **插件管理文档** | 插件管理器使用、安装、卸载、更新 | 用户和开发者 | [📖 管理文档](./plugin-management.md) |

### 文档关系图

```
入门: 插件开发完整指南 (NPM_PLUGIN_DEV_GUIDE.md)
    ↓
深入: NPM 插件规范 (NPM_PLUGIN_SPEC.md)
    ↓
进阶: 插件 UI 开发指南 (PLUGIN_UI_GUIDE.md)
    ↓
使用: 插件管理文档 (plugin-management.md)
```

### 学习路径

**初学者路径**：
1. 阅读 [🛠️ 插件开发完整指南](./NPM_PLUGIN_DEV_GUIDE.md) 的"快速开始"章节
2. 跟随文档创建第一个插件
3. 在本地测试插件
4. 发布到 npm

**进阶开发者路径**：
1. 阅读 [📦 NPM 插件规范](./NPM_PLUGIN_SPEC.md)，理解 ETP 协议
2. 学习 [🎨 插件 UI 开发指南](./PLUGIN_UI_GUIDE.md)，开发自定义 UI
3. 参考 [示例插件](../example-plugins/) 学习最佳实践

---

## 架构文档

| 文档 | 说明 | 链接 |
|------|------|------|
| 系统架构文档 | 前端、后端、插件系统架构详解 | [🏗️ 架构文档](./NPM_ARCHITECTURE.md) |
| 插件系统架构 | PluginLoader、PluginSandbox、PluginManager | [🏗️ 架构文档#插件系统](./NPM_ARCHITECTURE.md#插件系统) |
| 数据流设计 | 插件加载、执行、沙箱隔离流程 | [🏗️ 架构文档#数据流](./NPM_ARCHITECTURE.md#数据流) |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Components │  │    Hooks     │  │   Services   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                               │ Tauri IPC
                               │ invoke / events
┌─────────────────────────────┴───────────────────────────────┐
│                      Backend (Rust/Tauri)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Commands   │  │   Services   │  │  DB / Models │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

详细架构说明请参考 [🏗️ 架构文档](./NPM_ARCHITECTURE.md)

---

## 项目文档

| 文档 | 说明 | 链接 |
|------|------|------|
| 贡献指南 | 如何贡献代码、提交 PR | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| 安全策略 | 安全报告流程、安全最佳实践 | [SECURITY.md](../SECURITY.md) |
| 开源信息 | 许可证、资源管理、第三方声明 | [README#开源信息](../README.md#开源信息) |
| 代码规范 | 前端和后端代码规范 | [AGENTS.md](../AGENTS.md) |

---

## 示例代码

### 示例插件

| 示例 | 说明 | 位置 |
|------|------|------|
| Hello World | 最简单的插件示例 | [../example-plugins/hello-world/](../example-plugins/hello-world/) |
| UI 一致性演示 | 完整的 UI 组件使用示例 | [../example-plugins/ui-consistency-demo/](../example-plugins/ui-consistency-demo/) |
| DevTools | 完整的实用工具插件 | [../etools-devtools-plugin/](../etools-devtools-plugin/) |

### 示例 npm 插件

| 插件 | 说明 | npm 链接 |
|------|------|---------|
| @etools-plugin/hello | Hello World 示例 | [npmjs.com](https://www.npmjs.com/package/@etools-plugin/hello) |
| @etools-plugin/devtools | 开发者工具 | [npmjs.com](https://www.npmjs.com/package/@etools-plugin/devtools) |

---

## API 参考

### Tauri 命令

```typescript
// 插件生命周期管理
invoke('get_installed_plugins')
invoke('plugin_install', { source, options })
invoke('plugin_enable', { pluginId })
invoke('plugin_disable', { pluginId })
invoke('plugin_uninstall', { pluginId })

// 健康监控
invoke('plugin_get_health', { pluginId })
invoke('plugin_check_health', { pluginId })
invoke('plugin_get_usage_stats', { pluginId })

// 插件市场
invoke('marketplace_get_plugins')
invoke('marketplace_search', { query })
invoke('marketplace_install', { pluginId })
```

完整的 API 参考请参考 [插件管理文档](./plugin-management.md)

### TypeScript 类型

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  triggers: string[];
  settings: PluginSetting[];
  enabled: boolean;
  healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
}

interface PluginSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  action: () => void | Promise<void>;
}
```

完整的类型定义请参考 [NPM 插件规范](./NPM_PLUGIN_SPEC.md)

---

## 常见问题

### 插件开发

**Q: 如何快速开始开发插件？**
A: 阅读 [🛠️ 插件开发完整指南](./NPM_PLUGIN_DEV_GUIDE.md) 的"快速开始"章节，5 分钟即可创建第一个插件。

**Q: 插件如何获得权限？**
A: 在 `package.json` 的 `etools.permissions` 中声明所需的权限。详见 [NPM 插件规范](./NPM_PLUGIN_SPEC.md#可用权限)。

**Q: 如何测试插件？**
A: 参考 [插件开发完整指南 - 本地开发测试](./NPM_PLUGIN_DEV_GUIDE.md#本地开发测试) 章节。

**Q: 如何发布插件到 npm？**
A: 参考 [插件开发完整指南 - 发布到 npm](./NPM_PLUGIN_DEV_GUIDE.md#发布到-npm) 章节。

**Q: 插件 UI 如何保持一致性？**
A: 使用 [插件 UI 开发指南](./PLUGIN_UI_GUIDE.md) 中提供的 UI 组件库和设计令牌。

---

## 文档贡献

如果你发现文档有错误或需要补充，欢迎：

1. Fork 本仓库
2. 修改文档
3. 提交 Pull Request

详细的贡献指南请参考 [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/etools-team/etools/issues)
- **文档反馈**: 通过 GitHub Issues 提交文档改进建议
- **社区讨论**: 查看 [GitHub Discussions](https://github.com/etools-team/etools/discussions)

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-20
