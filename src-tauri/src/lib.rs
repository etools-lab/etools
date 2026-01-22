// Modules
mod db;
mod cmds;
mod models;
mod services;
mod types;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use cmds::app::{AppState, get_installed_apps, launch_app, track_app_usage, get_app_icon, get_app_icon_nsworkspace, get_recently_used};
use cmds::search::{SearchState, unified_search, get_search_stats, search_files, search_browser_data, update_browser_cache, index_files, get_file_index_stats, start_file_indexer, stop_file_indexer};
use cmds::clipboard::{get_clipboard_history, get_clipboard_item, paste_clipboard_item, delete_clipboard_item, clear_clipboard_history, get_clipboard_settings, set_clipboard_settings, search_clipboard, write_clipboard_text};
use cmds::plugins::{
    install_plugin, uninstall_plugin, enable_plugin, disable_plugin,
    get_plugin_manifest, reload_plugin, grant_plugin_permission, revoke_plugin_permission,
    get_plugin_permissions, set_plugin_setting, get_plugin_setting, validate_plugin_manifest,
    // New commands
    get_plugin_health, check_plugin_health, get_plugin_usage_stats,
    bulk_enable_plugins, bulk_disable_plugins, bulk_uninstall_plugins,
    plugin_validate_package, plugin_extract_package, plugin_install, plugin_get_install_status,
    plugin_cancel_install,
    plugin_validate_package_from_buffer, plugin_extract_package_from_buffer,
    plugin_uninstall,
    // Plugin abbreviation commands
    get_plugin_abbreviations, save_plugin_abbreviations,
    set_plugin_abbreviation, remove_plugin_abbreviation,
};
use cmds::shell::{open_url, get_default_browser};
use cmds::files::{read_file, write_file};
use cmds::marketplace::{marketplace_list, marketplace_search, marketplace_install, marketplace_uninstall, marketplace_update, marketplace_check_updates, marketplace_get_plugin, get_installed_plugins};
use cmds::settings::{get_settings, get_setting, set_setting, update_settings, reset_settings, init_preferences, get_hotkey, set_hotkey, unregister_all_hotkeys, reregister_hotkey, check_hotkey_conflicts, get_settings_file_path};
use cmds::window::{get_screen_info, resize_window_smart};
use cmds::performance::{PerformanceState, get_performance_metrics, check_performance_requirements, record_performance_event, get_average_search_time};
use cmds::abbreviation::{get_abbreviation_config, save_abbreviation_config, add_abbreviation, update_abbreviation, delete_abbreviation, export_abbreviation_config, import_abbreviation_config};
use cmds::debug::{write_debug_log, clear_debug_log, read_debug_log};
use services::{get_log_file_path, read_log_file, clear_log_file};

/// Get the default global hotkey for the current platform.
/// Simplifies duplicate default hotkey logic throughout the codebase.
fn default_hotkey() -> String {
    #[cfg(target_os = "macos")]
    return "Cmd+Shift+K".to_string();
    #[cfg(not(target_os = "macos"))]
    return "Ctrl+Shift+K".to_string();
}

/// Parse hotkey string (e.g., "Cmd+Space", "Ctrl+Shift+A") into a Shortcut
pub fn parse_hotkey(hotkey: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = hotkey.split('+').collect();
    if parts.is_empty() {
        return Err("Invalid hotkey format".to_string());
    }

    let mut modifiers = Vec::new();
    let mut key = None;

    for part in parts {
        let part = part.trim();
        match part.to_uppercase().as_str() {
            "CMD" | "SUPER" | "WIN" | "META" => modifiers.push(Modifiers::SUPER),
            "CTRL" | "CONTROL" => modifiers.push(Modifiers::CONTROL),
            "ALT" | "OPTION" => modifiers.push(Modifiers::ALT),
            "SHIFT" => modifiers.push(Modifiers::SHIFT),
            _ => {
                // Last non-modifier part is the key
                if key.is_none() {
                    key = Some(part);
                }
            }
        }
    }

    let key_code = parse_key_code(key.ok_or("No key found in hotkey")?)?;
    let modifiers_mask = modifiers.into_iter().fold(Modifiers::empty(), |acc, m| acc | m);

    Ok(Shortcut::new(
        if modifiers_mask.is_empty() { None } else { Some(modifiers_mask) },
        key_code
    ))
}

/// Parse key name into Code
fn parse_key_code(key: &str) -> Result<Code, String> {
    match key.to_uppercase().as_str() {
        "SPACE" => Ok(Code::Space),
        "A" => Ok(Code::KeyA),
        "B" => Ok(Code::KeyB),
        "C" => Ok(Code::KeyC),
        "D" => Ok(Code::KeyD),
        "E" => Ok(Code::KeyE),
        "F" => Ok(Code::KeyF),
        "G" => Ok(Code::KeyG),
        "H" => Ok(Code::KeyH),
        "I" => Ok(Code::KeyI),
        "J" => Ok(Code::KeyJ),
        "K" => Ok(Code::KeyK),
        "L" => Ok(Code::KeyL),
        "M" => Ok(Code::KeyM),
        "N" => Ok(Code::KeyN),
        "O" => Ok(Code::KeyO),
        "P" => Ok(Code::KeyP),
        "Q" => Ok(Code::KeyQ),
        "R" => Ok(Code::KeyR),
        "S" => Ok(Code::KeyS),
        "T" => Ok(Code::KeyT),
        "U" => Ok(Code::KeyU),
        "V" => Ok(Code::KeyV),
        "W" => Ok(Code::KeyW),
        "X" => Ok(Code::KeyX),
        "Y" => Ok(Code::KeyY),
        "Z" => Ok(Code::KeyZ),
        "0" => Ok(Code::Digit0),
        "1" => Ok(Code::Digit1),
        "2" => Ok(Code::Digit2),
        "3" => Ok(Code::Digit3),
        "4" => Ok(Code::Digit4),
        "5" => Ok(Code::Digit5),
        "6" => Ok(Code::Digit6),
        "7" => Ok(Code::Digit7),
        "8" => Ok(Code::Digit8),
        "9" => Ok(Code::Digit9),
        "=" => Ok(Code::Equal),
        "-" => Ok(Code::Minus),
        "[" => Ok(Code::BracketLeft),
        "]" => Ok(Code::BracketRight),
        "\\" => Ok(Code::Backslash),
        ";" => Ok(Code::Semicolon),
        "'" => Ok(Code::Quote),
        "," => Ok(Code::Comma),
        "." => Ok(Code::Period),
        "/" => Ok(Code::Slash),
        "`" => Ok(Code::Backquote),
        "F1" => Ok(Code::F1),
        "F2" => Ok(Code::F2),
        "F3" => Ok(Code::F3),
        "F4" => Ok(Code::F4),
        "F5" => Ok(Code::F5),
        "F6" => Ok(Code::F6),
        "F7" => Ok(Code::F7),
        "F8" => Ok(Code::F8),
        "F9" => Ok(Code::F9),
        "F10" => Ok(Code::F10),
        "F11" => Ok(Code::F11),
        "F12" => Ok(Code::F12),
        "ENTER" | "RETURN" => Ok(Code::Enter),
        "TAB" => Ok(Code::Tab),
        "ESC" | "ESCAPE" => Ok(Code::Escape),
        "BACKSPACE" => Ok(Code::Backspace),
        "DELETE" | "DEL" => Ok(Code::Delete),
        "INSERT" => Ok(Code::Insert),
        "HOME" => Ok(Code::Home),
        "END" => Ok(Code::End),
        "PAGEUP" => Ok(Code::PageUp),
        "PAGEDOWN" => Ok(Code::PageDown),
        "UP" | "ARROWUP" => Ok(Code::ArrowUp),
        "DOWN" | "ARROWDOWN" => Ok(Code::ArrowDown),
        "LEFT" | "ARROWLEFT" => Ok(Code::ArrowLeft),
        "RIGHT" | "ARROWRIGHT" => Ok(Code::ArrowRight),
        // Support for underscore and other shifted symbols
        "_" | "+" | "{" | "}" | "|" | ":" | "\"" | "<" | ">" | "?" | "~" | "!" | "@" | "#" | "$" | "%" | "^" | "&" | "*" | "(" | ")" => {
            // Map shifted symbols to their base keys
            match key {
                "_" | "+" => Ok(Code::Equal),
                "{" | "[" => Ok(Code::BracketLeft),
                "}" | "]" => Ok(Code::BracketRight),
                "|" | "\\" => Ok(Code::Backslash),
                ":" | ";" => Ok(Code::Semicolon),
                "\"" | "'" => Ok(Code::Quote),
                "<" | "," => Ok(Code::Comma),
                ">" | "." => Ok(Code::Period),
                "?" | "/" => Ok(Code::Slash),
                "~" | "`" => Ok(Code::Backquote),
                "!" | "1" => Ok(Code::Digit1),
                "@" | "2" => Ok(Code::Digit2),
                "#" | "3" => Ok(Code::Digit3),
                "$" | "4" => Ok(Code::Digit4),
                "%" | "5" => Ok(Code::Digit5),
                "^" | "6" => Ok(Code::Digit6),
                "&" | "7" => Ok(Code::Digit7),
                "*" | "8" => Ok(Code::Digit8),
                "(" | "9" => Ok(Code::Digit9),
                ")" | "0" => Ok(Code::Digit0),
                _ => Err(format!("Unsupported key: {}", key)),
            }
        }
        _ => Err(format!("Unsupported key: {}", key)),
    }
}

// Toggle window visibility
#[tauri::command]
fn toggle_window(window: tauri::Window) -> Result<(), String> {
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Show settings window - 已废弃，现在使用单窗口架构
// 保留此命令以避免破坏现有代码，但不再执行任何操作
#[tauri::command]
fn show_settings_window(_app: tauri::AppHandle) -> Result<(), String> {
    println!("show_settings_window called - this command is deprecated in single-window architecture");
    Ok(())
}

// Hide settings window - 已废弃，现在使用单窗口架构
// 保留此命令以避免破坏现有代码，但不再执行任何操作
#[tauri::command]
fn hide_settings_window(_app: tauri::AppHandle) -> Result<(), String> {
    println!("hide_settings_window called - this command is deprecated in single-window architecture");
    Ok(())
}

// Show plugin popup - 已废弃，现在使用单窗口架构
// 保留此命令以避免破坏现有代码，但不再执行任何操作
#[tauri::command]
fn show_plugin_popup(_app: tauri::AppHandle, _data: serde_json::Value) -> Result<(), String> {
    println!("show_plugin_popup called - this command is deprecated in single-window architecture");
    Ok(())
}

// Hide plugin popup - 已废弃，现在使用单窗口架构
// 保留此命令以避免破坏现有代码，但不再执行任何操作
#[tauri::command]
fn hide_plugin_popup(_app: tauri::AppHandle) -> Result<(), String> {
    println!("hide_plugin_popup called - this command is deprecated in single-window architecture");
    Ok(())
}

// ============================================================================
// Backend Log Commands
// ============================================================================

/// 获取后端日志文件路径
#[tauri::command]
fn get_backend_log_path(handle: tauri::AppHandle) -> Result<String, String> {
    get_log_file_path(&handle)
        .map(|p| p.to_string_lossy().to_string())
}

/// 读取后端日志文件
#[tauri::command]
fn read_backend_log(handle: tauri::AppHandle, limit: Option<usize>) -> Result<String, String> {
    read_log_file(&handle, limit)
}

/// 清除后端日志文件
#[tauri::command]
fn clear_backend_log(handle: tauri::AppHandle) -> Result<(), String> {
    clear_log_file(&handle)
}

// Hide window
#[tauri::command]
fn hide_window(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

// Show window
#[tauri::command]
fn show_window(window: tauri::Window) -> Result<(), String> {
    // 获取当前显示器信息
    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No monitor found")?;

    let screen_size = monitor.size();
    let window_size = window.outer_size().map_err(|e| e.to_string())?;

    // 计算居中位置
    let x = (screen_size.width as i32 - window_size.width as i32) / 2;
    let y = (screen_size.height as i32 - window_size.height as i32) / 2;

    println!("[show_window] Screen size: {}x{}, Window size: {}x{}, Position: ({}, {})",
        screen_size.width, screen_size.height,
        window_size.width, window_size.height,
        x, y
    );

    // 强制设置窗口位置
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    println!("[show_window] Window shown and focused at ({}, {})", x, y);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 初始化日志系统（必须在最开始）
            if let Err(e) = services::init_logger(app.handle()) {
                eprintln!("Failed to initialize logger: {}", e);
            }

            log::info!("Application starting up");
            log::info!("App data dir: {:?}", app.path().app_data_dir());
            log::info!("App config dir: {:?}", app.path().app_config_dir());

            // Initialize app monitor state
            app.manage(AppState {
                app_monitor: std::sync::Mutex::new(services::app_monitor::AppMonitor::new()),
            });

            log::debug!("App monitor state initialized");

            // Initialize search state
            app.manage(SearchState {
                app_monitor: std::sync::Mutex::new(services::app_monitor::AppMonitor::new()),
                file_indexer: std::sync::Mutex::new(None),
            });

            // Initialize performance monitor state
            app.manage(PerformanceState {
                monitor: std::sync::Arc::new(std::sync::Mutex::new(services::performance::PerformanceMonitor::new())),
            });

            // Clear old window state to ensure window centers properly
            if let Ok(config_dir) = app.path().app_config_dir() {
                use std::fs;
                let window_state_path = config_dir.join("window_state.json");
                if window_state_path.exists() {
                    let _ = fs::remove_file(&window_state_path);
                    println!("[Setup] Removed old window state file to ensure proper centering");
                }
            }

            // Get the main window
            let window = app.get_webview_window("main").unwrap();

            // Open DevTools automatically in development mode
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            // Load hotkey from settings or use default
            let settings_path = app.path().app_config_dir()
                .map_err(|e| format!("Failed to get config dir: {}", e))?;
            let settings_file = settings_path.join("settings.json");

            // Load hotkey from settings or use default (simplified with helper function)
            let hotkey_str = if settings_file.exists() {
                use std::fs;
                fs::read_to_string(&settings_file)
                    .ok()
                    .and_then(|content| {
                        serde_json::from_str::<crate::models::preferences::AppSettings>(&content).ok()
                    })
                    .map(|settings| settings.global_hotkey)
                    .unwrap_or_else(|| default_hotkey())
            } else {
                default_hotkey()
            };

            log::info!("Loading global hotkey from settings: {}", hotkey_str);

            // Parse hotkey string and register
            let shortcut = parse_hotkey(&hotkey_str)?;
            log::info!("Parsed hotkey: {:?} from string: {}", shortcut, hotkey_str);

            use std::sync::atomic::{AtomicBool, Ordering};
            use std::sync::Arc;

            let is_toggling = Arc::new(AtomicBool::new(false));
            let window_clone = window.clone();

            app.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
                // Prevent rapid toggle
                if is_toggling.swap(true, Ordering::SeqCst) {
                    log::debug!("Global shortcut: Ignoring rapid toggle");
                    return;
                }

                let is_visible = window_clone.is_visible().unwrap_or(false);
                log::debug!("Global shortcut: Toggle triggered, window visible: {}", is_visible);

                if is_visible {
                    let _ = window_clone.hide();
                    log::info!("Window hidden via global shortcut");
                } else {
                    // 显示窗口前先定位到鼠标所在屏幕的中心偏上位置
                    let window_width = 800u32;
                    let window_height = 600u32;

                    // 获取鼠标位置
                    if let Ok(cursor_pos) = window_clone.cursor_position() {
                        let cursor_x = cursor_pos.x as i32;
                        let cursor_y = cursor_pos.y as i32;

                        println!("[GlobalShortcut] Cursor position: ({}, {})", cursor_x, cursor_y);

                        // 遍历所有显示器，找到包含鼠标位置的显示器
                        let target_monitor = window_clone.available_monitors()
                            .ok()
                            .and_then(|monitors| {
                                monitors.into_iter().find(|monitor| {
                                    let monitor_pos = monitor.position();
                                    let monitor_size = monitor.size();

                                    let monitor_x = monitor_pos.x as i32;
                                    let monitor_y = monitor_pos.y as i32;
                                    let monitor_width = monitor_size.width as i32;
                                    let monitor_height = monitor_size.height as i32;

                                    // 检查鼠标是否在该显示器范围内
                                    cursor_x >= monitor_x &&
                                        cursor_x < monitor_x + monitor_width &&
                                        cursor_y >= monitor_y &&
                                        cursor_y < monitor_y + monitor_height
                                })
                            });

                        if let Some(monitor) = target_monitor {
                            let monitor_pos = monitor.position();
                            let monitor_size = monitor.size();

                            let monitor_x = monitor_pos.x as i32;
                            let monitor_y = monitor_pos.y as i32;
                            let monitor_width = monitor_size.width as i32;
                            let monitor_height = monitor_size.height as i32;

                            // 计算显示器的中心位置
                            let center_x = monitor_x + monitor_width / 2;
                            let center_y = monitor_y + monitor_height / 2;

                            // 窗口中心点向上偏移（显示器高度的 1/15），更符合人体工学
                            let offset_y = monitor_height / 15;
                            let target_center_x = center_x;
                            let target_center_y = center_y - offset_y;

                            // 获取窗口实际尺寸（考虑 DPI 缩放）
                            let actual_size = match window_clone.outer_size() {
                                Ok(size) => {
                                    println!("[GlobalShortcut] Got actual window size: {}x{}", size.width, size.height);
                                    (size.width as i32, size.height as i32)
                                }
                                Err(_) => {
                                    println!("[GlobalShortcut] Failed to get window size, using expected size");
                                    (window_width as i32, window_height as i32)
                                }
                            };

                            let actual_width = actual_size.0;
                            let actual_height = actual_size.1;

                            // 使用实际窗口尺寸计算位置
                            // 窗口中心点对准 (target_center_x, target_center_y)
                            // 窗口左上角 = (target_center_x - actual_width/2, target_center_y - actual_height/2)
                            let x = target_center_x - actual_width / 2;
                            let y = target_center_y - actual_height / 2;

                            println!("[GlobalShortcut] Found monitor: {}x{} at ({}, {})", monitor_width, monitor_height, monitor_x, monitor_y);
                            println!("[GlobalShortcut] Monitor center: ({}, {})", center_x, center_y);
                            println!("[GlobalShortcut] Target center (offset -{}): ({}, {})", offset_y, target_center_x, target_center_y);
                            println!("[GlobalShortcut] Actual window size: {}x{}", actual_width, actual_height);
                            println!("[GlobalShortcut] Window position (top-left): ({}, {})", x, y);
                            println!("[GlobalShortcut] Window center: ({}, {})", x + actual_width / 2, y + actual_height / 2);

                            let _ = window_clone.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                        } else {
                            println!("[GlobalShortcut] ✗ No monitor found, using current_monitor as fallback");
                            // 回退到 current_monitor
                            match window_clone.current_monitor() {
                                Ok(Some(monitor)) => {
                                    let monitor_pos = monitor.position();
                                    let monitor_size = monitor.size();

                                    let monitor_x = monitor_pos.x as i32;
                                    let monitor_y = monitor_pos.y as i32;
                                    let monitor_width = monitor_size.width as i32;
                                    let monitor_height = monitor_size.height as i32;

                                    let center_x = monitor_x + monitor_width / 2;
                                    let center_y = monitor_y + monitor_height / 2;

                                    let x = center_x - window_width as i32 / 2;
                                    let y = center_y - window_height as i32 / 2;

                                    println!("[GlobalShortcut] Fallback monitor: {}x{} at ({}, {})", monitor_width, monitor_height, monitor_x, monitor_y);
                                    println!("[GlobalShortcut] Fallback center: ({}, {}), Window: ({}, {})", center_x, center_y, x, y);

                                    let _ = window_clone.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                                }
                                _ => {
                                    let _ = window_clone.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 100, y: 100 }));
                                }
                            }
                        }
                    }

                    // 显示窗口
                    let _ = window_clone.show();
                    let _ = window_clone.set_focus();
                    println!("[GlobalShortcut] Window shown and focused");

                    // 发送事件到前端，通知窗口已显示并聚焦
                    let _ = window_clone.emit("window-shown", ());
                }

                // Reset the flag after a short delay
                let flag = is_toggling.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    flag.store(false, Ordering::SeqCst);
                });
            }).map_err(|e| format!("Failed to register global shortcut: {}", e))?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Window commands
            toggle_window,
            hide_window,
            show_window,
            show_settings_window,
            hide_settings_window,
            show_plugin_popup,
            hide_plugin_popup,
            get_screen_info,
            resize_window_smart,
            // App commands
            get_installed_apps,
            launch_app,
            track_app_usage,
            get_app_icon,
            get_app_icon_nsworkspace,
            get_recently_used,
            // Search commands
            unified_search,
            get_search_stats,
            search_files,
            search_browser_data,
            update_browser_cache,
            index_files,
            get_file_index_stats,
            start_file_indexer,
            stop_file_indexer,
            // Clipboard commands
            get_clipboard_history,
            get_clipboard_item,
            paste_clipboard_item,
            delete_clipboard_item,
            clear_clipboard_history,
            get_clipboard_settings,
            set_clipboard_settings,
            search_clipboard,
            write_clipboard_text,
            // Plugin commands
            // ✅ 安全加固：移除 plugin_list，只允许从市场安装插件
            // plugin_list,  // 已禁用
            install_plugin,
            uninstall_plugin,
            enable_plugin,
            disable_plugin,
            get_plugin_manifest,
            reload_plugin,
            grant_plugin_permission,
            revoke_plugin_permission,
            get_plugin_permissions,
            set_plugin_setting,
            get_plugin_setting,
            validate_plugin_manifest,
            // New plugin commands
            get_plugin_health,
            check_plugin_health,
            get_plugin_usage_stats,
            bulk_enable_plugins,
            bulk_disable_plugins,
            bulk_uninstall_plugins,
            // Plugin installation commands
            plugin_validate_package,
            plugin_extract_package,
            plugin_install,
            plugin_get_install_status,
            plugin_cancel_install,
            plugin_validate_package_from_buffer,
            plugin_extract_package_from_buffer,
            plugin_uninstall,
            // Plugin abbreviation commands
            get_plugin_abbreviations,
            save_plugin_abbreviations,
            set_plugin_abbreviation,
            remove_plugin_abbreviation,
            // Performance commands
            get_performance_metrics,
            check_performance_requirements,
            record_performance_event,
            get_average_search_time,
            // Shell commands
            open_url,
            get_default_browser,
            // File system commands
            read_file,
            write_file,
            // Marketplace commands
            marketplace_list,
            marketplace_search,
            marketplace_install,
            marketplace_uninstall,
            marketplace_update,
            marketplace_check_updates,
            marketplace_get_plugin,
            get_installed_plugins,
            // Settings commands
            get_settings,
            get_setting,
            set_setting,
            update_settings,
            reset_settings,
            init_preferences,
            get_hotkey,
            set_hotkey,
            unregister_all_hotkeys,
            reregister_hotkey,
            check_hotkey_conflicts,
            get_settings_file_path,
            // Debug commands
            write_debug_log,
            clear_debug_log,
            read_debug_log,
            // Backend log commands
            get_backend_log_path,
            read_backend_log,
            clear_backend_log,
            // Abbreviation commands
            get_abbreviation_config,
            save_abbreviation_config,
            add_abbreviation,
            update_abbreviation,
            delete_abbreviation,
            export_abbreviation_config,
            import_abbreviation_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
