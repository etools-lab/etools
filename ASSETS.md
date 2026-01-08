# 资源文件清单 (Assets Inventory)

本文档记录项目中使用的所有图标、图片、字体等素材的来源和许可证信息。

## 应用图标

### 位置
- `src-tauri/icons/` - 应用程序图标（各种尺寸）

### 来源
- **创建日期**: 2025-12-30
- **创建者**: Chee-0806
- **许可证**: 项目自有，MIT License
- **说明**: 原创设计，未使用任何第三方素材

### 文件列表
```
src-tauri/icons/
├── 128x128.png              - macOS 标准图标
├── 128x128@2x.png           - macOS Retina 图标
├── 32x32.png                - macOS 小图标
├── icon.icns                - macOS 图标容器
├── icon.ico                 - Windows 图标容器
├── icon.png                 - 源图标 (512x512)
├── Square107x107Logo.png    - Windows 小图标
├── Square142x142Logo.png    - Windows 中图标
├── Square150x150Logo.png    - Windows 中图标
├── Square284x284Logo.png    - Windows 大图标
├── Square30x30Logo.png      - Windows 最小图标
├── Square310x310Logo.png    - Windows 超大图标
├── Square44x44Logo.png      - Windows 小图标
├── Square71x71Logo.png      - Windows 中小图标
└── Square89x89Logo.png      - Windows 中图标
```

## 前端资源

### React Logo
- **位置**: `src/assets/react.svg`
- **来源**: React 官方网站
- **许可证**: [MIT License](https://github.com/facebook/react/blob/main/LICENSE)
- **用途**: 示例代码，可移除

### Vite Logo
- **位置**: `public/vite.svg`
- **来源**: Vite 官方网站
- **许可证**: [MIT License](https://github.com/vitejs/vite/blob/main/LICENSE)
- **用途**: 示例代码，可移除

### Tauri Logo
- **位置**: `public/tauri.svg`
- **来源**: Tauri 官方网站
- **许可证**: [MIT License](https://github.com/tauri-apps/tauri/blob/dev/LICENSE)
- **用途**: 示例代码，可移除

## 配置文件

### 市场配置
- **位置**: `src-tauri/assets/marketplace.json`
- **说明**: 插件市场配置数据
- **来源**: 项目自有

### 偏好设置
- **位置**: `src-tauri/assets/preferences.json`
- **说明**: 默认用户偏好设置
- **来源**: 项目自有

## 第三方库资源

以下资源通过 npm 包管理，遵循各自的许可证：

### 依赖库图标
- **React**: MIT License
- **Tauri**: MIT License / Apache 2.0
- **Vite**: MIT License
- **Fuse.js**: Apache 2.0
- **Zustand**: MIT License

所有依赖库的许可证信息可在 `node_modules/<package-name>/LICENSE` 中找到。

## 字体

项目当前未使用自定义字体，使用系统默认字体。

## 原创性保证

✅ **所有图标和设计素材均为原创**
✅ **未使用任何第三方专有素材**
✅ **所有第三方资源均使用 MIT 或兼容的开源许可**
✅ **所有原创素材遵循 MIT License**

## 审计日期

- **创建日期**: 2025-01-08
- **最后审计**: 2025-01-08
- **审计人**: Claude Code
- **状态**: ✅ 通过

---

**注意**: 如需添加新的资源文件，请更新此文档并确保：
1. 记录资源来源
2. 确认许可证兼容性
3. 对于原创资源，标记为"项目自有"
