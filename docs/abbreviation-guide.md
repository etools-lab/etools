# 缩写配置系统使用指南

Kaka 现在支持全局缩写配置功能，让您可以通过简短的缩写快速访问常用网站和链接。

## 功能特性

- **全局缩写展开**：在任何搜索中输入缩写加冒号（如 `gh:`）即可直接展开
- **智能搜索匹配**：支持缩写、URL和描述的模糊搜索
- **分类管理**：将缩写按用途分类组织
- **优先级最高**：缩写结果在搜索中具有最高优先级
- **自动打开**：可选的唯一匹配自动展开功能
- **导入导出**：支持配置文件的备份和迁移

## 基本使用

### 1. 直接展开
在搜索框中输入缩写加冒号：
```
gh:      → 展开为 https://github.com
ggl:     → 展开为 https://google.com
so:       → 展开为 https://stackoverflow.com
```

### 2. 搜索缩写
输入缩写的部分字符来搜索相关缩写：
```
gh    → 显示 "gh: https://github.com"
git   → 显示所有包含 "git" 的缩写
```

### 3. 配置管理

#### 添加缩写
1. 打开设置面板（快捷键：`Cmd+,`）
2. 选择"缩写"标签页
3. 点击"添加缩写"按钮
4. 填写信息：
   - **缩写**：简短的触发词（如：gh）
   - **展开**：完整的URL（如：https://github.com）
   - **描述**：可选的说明（如：GitHub）
   - **分类**：选择或创建分类
   - **启用**：是否激活此缩写

#### 编辑缩写
1. 在缩写列表中找到要编辑的项目
2. 点击"编辑"按钮
3. 修改所需信息
4. 点击"更新"保存

#### 删除缩写
1. 在缩写列表中找到要删除的项目
2. 点击"删除"按钮
3. 确认删除操作

## 高级配置

### 全局设置
- **启用缩写功能**：总开关，关闭后所有缩写功能不可用
- **自动打开唯一匹配**：当只有一个匹配结果时自动打开
- **在搜索中显示**：控制缩写是否出现在搜索结果中
- **区分大小写**：缩写匹配是否区分大小写

### 分类管理
默认分类：
- 💻 开发工具：编程和开发相关
- 🔍 搜索引擎：搜索和查询
- 👥 社交网络：社交媒体平台
- ⚡ 生产力：办公和效率工具
- 🎮 娱乐：视频、音乐和游戏
- 🛒 购物：电商平台
- 📚 教育：学习和教育
- 📰 新闻：新闻资讯

### 默认缩写
系统预置了一些常用缩写：
```
gh   → https://github.com      (开发工具)
gl   → https://gitlab.com      (开发工具)
ggl  → https://google.com       (搜索引擎)
so   → https://stackoverflow.com (开发工具)
yt   → https://youtube.com      (娱乐)
tw   → https://twitter.com      (社交网络)
li   → https://linkedin.com     (社交网络)
mdn  → https://developer.mozilla.org (开发工具)
npm  → https://npmjs.com        (开发工具)
mail → https://mail.google.com  (生产力)
cal  → https://calendar.google.com (生产力)
drive→ https://drive.google.com   (生产力)
maps → https://maps.google.com  (生产力)
play → https://play.google.com  (娱乐)
news → https://news.google.com   (新闻)
```

## 配置备份

### 导出配置
1. 在缩写设置页面点击"导出配置"
2. 保存 `abbreviations.json` 文件到安全位置

### 导入配置
1. 在缩写设置页面点击"导入配置"
2. 选择之前导出的 `abbreviations.json` 文件
3. 确认导入操作

## 使用技巧

### 1. 缩写命名建议
- **简短易记**：使用2-4个字符
- **避免冲突**：不要与常用命令重复
- **语义化**：选择有意义的缩写
- **一致性**：同类功能使用相似的命名模式

好的缩写示例：
```
gh, gl, bb    → Git 仓库
ggl, ddg, bing  → 搜索引擎
yt, tw, fb     → 社交媒体
mail, cal, drive → Google 服务
npm, pypi, cargo → 包管理器
```

### 2. 分类组织
按用途合理分类：
- **工作相关**：邮箱、日历、文档
- **开发工具**：代码仓库、文档、包管理
- **日常使用**：购物、新闻、娱乐
- **系统工具**：设置、监控、管理

### 3. 搜索优化
- **精确匹配**：使用 `缩写:` 格式直接展开
- **模糊搜索**：输入部分字符查找相关缩写
- **描述搜索**：可以通过描述查找忘记的缩写

## 故障排除

### 常见问题

**Q: 缩写不展开？**
A: 检查以下设置：
- 全局缩写功能是否启用
- 具体缩写是否启用
- 输入格式是否正确（需要冒号）

**Q: 搜索中看不到缩写？**
A: 确认：
- "在搜索中显示"选项是否开启
- 缩写是否已启用
- 搜索关键词是否正确

**Q: 自动打开不工作？**
A: 验证：
- "自动打开唯一匹配"是否开启
- 是否只有一个匹配结果
- 缩写格式是否以冒号结尾

**Q: 配置导入失败？**
A: 检查：
- 文件格式是否为有效的 JSON
- 文件是否包含必需的字段
- 是否有语法错误

### 性能优化
- 缩写数量建议控制在 50 个以内
- 定期清理不使用的缩写
- 使用有意义的分类组织
- 避免过于复杂的缩写规则

## API 扩展

开发者可以通过编程方式访问缩写功能：

```typescript
import { abbreviationService } from '@/services/abbreviationService';

// 展开缩写
const url = abbreviationService.expandAbbreviation('gh');

// 搜索缩写
const results = abbreviationService.searchAbbreviations('git');

// 获取配置
const config = abbreviationService.getConfig();

// 添加缩写
const newAbbr = await abbreviationService.addAbbreviation({
  abbr: 'example',
  expansion: 'https://example.com',
  description: 'Example Site',
  category: 'test',
  enabled: true
});
```

## 更新日志

### v1.0.0
- 初始版本发布
- 基本的缩写展开功能
- 分类管理系统
- 导入导出功能
- 搜索集成
- 配置界面

---

享受高效的缩写体验！如果有问题或建议，请通过 GitHub Issues 反馈。