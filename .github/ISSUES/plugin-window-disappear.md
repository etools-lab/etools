# Issue: 插件安装后主窗口消失

## 问题描述

在插件市场安装 NPM 插件（如 `@etools-plugin/devtools`）后，主程序窗口消失，但进程仍在运行。手动删除插件文件后窗口恢复正常。

## 重现步骤

1. 打开主窗口 (Cmd+Shift+K)
2. 进入插件市场
3. 安装 `@etools-plugin/devtools` 插件
4. 安装成功后窗口消失

## 根因分析

通过日志分析发现两个问题：

### 问题 1: esbuild.transform() 在 .mjs 文件上卡住

日志显示：
```
[PluginLoader] isTypeScript: false
# 然后就没有后续日志了
```

对于已构建的 `.mjs` 文件，不需要调用 `esbuild.transform()` 进行转译，直接使用即可。

**修复**: 在 `createBlobUrlFromPath()` 中跳过对 `.mjs` 文件的 esbuild 处理。

### 问题 2: Node.js 内置模块无法在 blob URL 中解析

错误信息：
```
Module name, 'crypto' does not resolve to a valid URL.
```

插件依赖了 `bcryptjs` 等需要在 Node.js 环境下运行的库，通过 `createObjectURL` 创建的 blob URL 无法解析 `crypto` 等内置模块。

**修复**: 对于预构建的 `.mjs` 文件，使用 Vite 的直接动态导入，让 Vite 的预打包系统处理依赖。

## 修复方案

修改 `src/services/pluginLoader.ts`:
1. 在 `createBlobUrlFromPath()` 中跳过对 `.mjs` 文件的 esbuild 处理
2. 在 `loadPlugin()` 中对 `.mjs` 文件使用直接导入而非 blob URL

## 相关文件

- `src/services/pluginLoader.ts` - 插件加载器

## 状态

修复已实现，待测试验证。
