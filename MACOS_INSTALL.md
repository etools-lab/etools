# macOS 安装说明

## 应用无法打开的解决方案

如果下载后双击应用提示"应用程序'etools'无法打开"，这是因为 macOS 的安全机制阻止了未签名或来自互联网的应用。

### 方法 1：右键打开（推荐）

1. 在 Finder 中找到 `etools.app`
2. **右键点击**应用（不是双击）
3. 选择"打开"
4. 在弹出的对话框中点击"打开"

**只需操作一次，之后就可以正常双击打开了。**

### 方法 2：系统设置允许

1. 打开"系统设置"
2. 进入"隐私与安全性"
3. 向下滚动找到"etools"被阻止的提示
4. 点击"仍要打开"

### 方法 3：命令行移除限制

打开终端，运行以下命令：

```bash
# 移除下载隔离属性
xattr -cr ~/Downloads/etools.app

# 如果已安装到 Applications
xattr -cr /Applications/etools.app
```

### 方法 4：禁用 Gatekeeper（不推荐，仅用于开发）

```bash
# 完全禁用 Gatekeeper（需要管理员权限）
sudo spctl --master-disable

# 完成后可以重新启用
sudo spctl --master-enable
```

## 关于应用签名

etools 使用 ad-hoc 签名（自签名），这意味着：

- ✅ 应用完全正常可用
- ✅ 不需要付费的 Apple Developer 账号
- ⚠️ 首次打开需要手动确认（如上方法）
- ⚠️ 每次更新需要重新确认

## 为什么不使用正式签名？

正式签名需要：
1. Apple Developer 账号（$99/年）
2. 证书和配置文件
3. 代码审查流程

作为开源项目，etools 使用 ad-hoc 签名来降低成本和简化发布流程。

## 安全提示

这个应用是开源的，你可以：
- 查看源代码：https://github.com/Chee-0806/etools
- 自己构建应用
- 验证应用完整性

如有疑虑，建议从 GitHub Releases 页面下载官方版本。
