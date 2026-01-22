# 日志系统使用指南

## 概述

etools 现在拥有完整的日志系统，前后端日志都会自动写入文件，便于调试和问题排查。

## 日志文件位置

日志文件存储在应用数据目录中：

### macOS
```
~/Library/Application Support/etools/backend.log  (后端日志)
~/Library/Application Support/etools/debug.log     (前端日志)
```

### Linux
```
~/.config/etools/backend.log  (后端日志)
~/.config/etools/debug.log     (前端日志)
```

### Windows
```
%APPDATA%\etools\backend.log  (后端日志)
%APPDATA%\etools\debug.log     (前端日志)
```

## 日志特性

### 后端日志 (backend.log)

- **日志级别**: Debug (开发环境) / Info (生产环境)
- **自动轮换**: 当日志文件超过 10MB 时自动轮换为 `backend.log.old`
- **格式**: `[时间] [级别] [模块] 消息内容`
- **输出目标**: 同时输出到控制台和文件

### 前端日志 (debug.log)

- **日志级别**: DEBUG, INFO, WARN, ERROR, LOG
- **缓冲机制**: 最多缓冲 50 条日志或每 2 秒自动刷新
- **格式**: `[时间] [级别] [标签] 消息内容 参数`
- **全局错误捕获**: 自动捕获未处理的错误和 Promise 拒绝

## 使用方法

### 前端使用日志

```typescript
import { logger } from '@/lib/logger';

// 不同级别的日志
logger.debug('MyComponent', 'Debug message', { someData: 'value' });
logger.info('MyComponent', 'Info message');
logger.warn('MyComponent', 'Warning message');
logger.error('MyComponent', 'Error occurred', error);
logger.log('MyComponent', 'Log message');

// 手动刷新日志缓冲区
import { flushLog } from '@/lib/logger';
await flushLog();
```

### 后端使用日志

```rust
use log::{info, debug, warn, error};

// 不同级别的日志
info!("Application starting up");
debug!("Detailed debug information: {}", some_value);
warn!("Warning message");
error!("Error occurred: {}", error);
```

## Tauri 命令

### 前端日志命令

```typescript
import { invoke } from '@tauri-apps/api/core';

// 写入前端日志（已自动集成在 logger 中）
await invoke('write_debug_log', { content: 'log content' });

// 读取前端日志
const logs = await invoke('read_debug_log', { limit: 100 });

// 清除前端日志
await invoke('clear_debug_log');
```

### 后端日志命令

```typescript
import { invoke } from '@tauri-apps/api/core';

// 获取后端日志文件路径
const path = await invoke('get_backend_log_path');

// 读取后端日志
const logs = await invoke('read_backend_log', { limit: 100 });

// 清除后端日志
await invoke('clear_backend_log');
```

## 日志示例

### 后端日志示例

```
[2025-01-22 10:30:45.123] [INFO] [etools_lib] Application starting up
[2025-01-22 10:30:45.124] [INFO] [etools_lib] App data dir: Some("/Users/xxx/Library/Application Support/etools")
[2025-01-22 10:30:45.125] [INFO] [etools_lib] App monitor state initialized
[2025-01-22 10:30:45.200] [INFO] [etools_lib] Loading global hotkey from settings: Cmd+Shift+K
[2025-01-22 10:30:45.201] [INFO] [etools_lib] Parsed hotkey: Shortcut(...) from string: Cmd+Shift+K
[2025-01-22 10:30:46.500] [DEBUG] [etools_lib] Global shortcut: Toggle triggered, window visible: false
```

### 前端日志示例

```
[2025-01-22T10:30:47.123Z] [INFO] [Logger] Logger initialized
[2025-01-22T10:30:47.200Z] [INFO] [App] Initializing application
[2025-01-22T10:30:47.500Z] [INFO] [App] Plugins loaded successfully
[2025-01-22T10:30:47.600Z] [ERROR] [GlobalError] Unhandled error: Cannot read property... {"filename":"...","lineno":123}
```

## 调试技巧

1. **查看实时日志**: 使用 `tail -f` 命令监控日志文件
   ```bash
   # macOS/Linux
   tail -f ~/Library/Application\ Support/etools/backend.log
   tail -f ~/Library/Application\ Support/etools/debug.log
   ```

2. **读取最近的日志**: 使用 Tauri 命令读取最近的 N 条日志
   ```typescript
   const recentLogs = await invoke('read_backend_log', { limit: 50 });
   ```

3. **清除日志**: 当日志文件过大时可以清除
   ```typescript
   await invoke('clear_backend_log');
   await invoke('clear_debug_log');
   ```

4. **查找错误**: 使用 grep 搜索错误日志
   ```bash
   grep ERROR backend.log
   grep "ERROR\|WARN" backend.log debug.log
   ```

## 注意事项

1. **性能影响**: 日志写入是异步的，对性能影响很小
2. **磁盘空间**: 日志文件会自动轮换，不会无限增长
3. **敏感信息**: 避免在日志中记录敏感信息（密码、token 等）
4. **开发环境**: 开发环境下后端日志级别为 DEBUG，会记录更详细的信息
5. **生产环境**: 生产环境下后端日志级别为 INFO，只记录重要信息

## 故障排查

### 日志未写入

1. 检查应用数据目录是否有写权限
2. 检查磁盘空间是否充足
3. 查看控制台是否有错误信息

### 日志文件过大

1. 日志文件超过 10MB 会自动轮换
2. 可以手动清除旧日志: `await invoke('clear_backend_log')`

### 找不到日志文件

1. 运行 `await invoke('get_backend_log_path')` 获取实际路径
2. 确保应用已至少运行过一次
