/**
 * Settings Commands
 * Handle application settings and preferences
 */

use crate::models::preferences::AppSettings;
use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

/// Settings storage path
fn get_settings_path(handle: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    println!("[Settings] Config directory: {:?}", app_dir);

    // Ensure directory exists
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;

    let settings_path = app_dir.join("settings.json");
    println!("[Settings] Settings file path: {:?}", settings_path);

    Ok(settings_path)
}

/// Load settings from file
fn load_settings(handle: &AppHandle) -> Result<AppSettings, String> {
    let settings_path = get_settings_path(handle)?;

    if !settings_path.exists() {
        // Return default settings if file doesn't exist
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))
}

/// Save settings to file
fn save_settings(handle: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let settings_path = get_settings_path(handle)?;

    println!("[Settings] Saving settings to: {:?}", settings_path);

    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;

    println!("[Settings] Settings saved successfully");
    Ok(())
}

/// Get all application settings (T025)
#[tauri::command]
pub fn get_settings(handle: AppHandle) -> Result<AppSettings, String> {
    load_settings(&handle)
}

/// Macro to generate setting getter match arms
/// Simplifies repetitive pattern matching for each setting field
macro_rules! impl_get_setting_match {
    ($settings:ident, $key:ident, { $($field:ident),* $(,)? }) => {
        match $key.as_str() {
            $(
                stringify!($field) => serde_json::to_value($settings.$field)
                    .map_err(|e| format!("Serialization error: {}", e)),
            )*
            _ => Err(format!("Unknown setting key: {}", $key)),
        }
    };
}

/// Get a single setting value by key (T025)
/// Simplified using macro to reduce code duplication
#[tauri::command]
pub fn get_setting(handle: AppHandle, key: String) -> Result<serde_json::Value, String> {
    let settings = load_settings(&handle)?;
    impl_get_setting_match!(settings, key, {
        startup_behavior,
        language,
        theme,
        window_opacity,
        show_menubar_icon,
        enable_clipboard,
        enable_file_search,
        enable_browser_search,
        anonymize_usage,
        crash_reports,
        search_debounce_ms,
        max_results,
        excluded_apps,
        file_index_paths,
    })
}

/// Macro to generate setting setter match arms
/// Simplifies repetitive pattern matching for each setting field
macro_rules! impl_set_setting_match {
    ($settings:ident, $key:ident, $value:ident, { $($field:ident),* $(,)? }) => {
        match $key.as_str() {
            $(
                stringify!($field) => {
                    $settings.$field = serde_json::from_value($value)
                        .map_err(|e| format!("Invalid {}: {}", stringify!($field), e))?;
                }
            )*
            _ => return Err(format!("Unknown setting key: {}", $key)),
        }
    };
}

/// Set a single setting value by key (T026)
/// Simplified using macro to reduce code duplication
#[tauri::command]
pub fn set_setting(handle: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
    let mut settings = load_settings(&handle)?;

    impl_set_setting_match!(settings, key, value, {
        startup_behavior,
        language,
        theme,
        window_opacity,
        show_menubar_icon,
        enable_clipboard,
        enable_file_search,
        enable_browser_search,
        anonymize_usage,
        crash_reports,
        search_debounce_ms,
        max_results,
        excluded_apps,
        file_index_paths,
    });

    save_settings(&handle, &settings)
}

/// Update all application settings (T027)
#[tauri::command]
pub fn update_settings(handle: AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings(&handle, &settings)
}

/// Reset settings to defaults
#[tauri::command]
pub fn reset_settings(handle: AppHandle) -> Result<AppSettings, String> {
    let defaults = AppSettings::default();
    save_settings(&handle, &defaults)?;
    Ok(defaults)
}

/// Initialize preferences on first run (T029)
#[tauri::command]
pub fn init_preferences(handle: AppHandle) -> Result<AppSettings, String> {
    let settings_path = get_settings_path(&handle)?;

    if !settings_path.exists() {
        let defaults = AppSettings::default();
        save_settings(&handle, &defaults)?;
        Ok(defaults)
    } else {
        load_settings(&handle)
    }
}

/// Get global hotkey (T181)
#[tauri::command]
pub fn get_hotkey(handle: AppHandle) -> Result<String, String> {
    let settings = load_settings(&handle)?;
    Ok(settings.global_hotkey)
}

/// Set global hotkey (T180)
#[tauri::command]
pub fn set_hotkey(handle: AppHandle, hotkey: String) -> Result<(), String> {
    // Validate hotkey format
    if !validate_hotkey(&hotkey) {
        return Err("Invalid hotkey format".to_string());
    }

    // Load current settings, update hotkey, and save
    let mut settings = load_settings(&handle)?;
    settings.global_hotkey = hotkey.clone();
    save_settings(&handle, &settings)?;

    println!("Hotkey updated to: {}", hotkey);
    println!("Note: Restart the application for the new hotkey to take effect");

    Ok(())
}

/// Unregister all global hotkeys
#[tauri::command]
pub fn unregister_all_hotkeys(handle: AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    handle.global_shortcut().unregister_all()
        .map_err(|e| format!("Failed to unregister hotkeys: {}", e))?;

    println!("All hotkeys unregistered");
    Ok(())
}

/// Reregister global hotkey at runtime without restart
#[tauri::command]
pub fn reregister_hotkey(handle: AppHandle, hotkey: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Validate hotkey format
    if !validate_hotkey(&hotkey) {
        return Err("Invalid hotkey format".to_string());
    }

    // Unregister all existing global shortcuts
    handle.global_shortcut().unregister_all()
        .map_err(|e| format!("Failed to unregister existing shortcuts: {}", e))?;

    // Parse and register the new hotkey
    let shortcut = crate::parse_hotkey(&hotkey)?;

    // Get the main window
    let window = handle.get_webview_window("main")
        .ok_or("Main window not found")?;

    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    let is_toggling = Arc::new(AtomicBool::new(false));
    let window_clone = window.clone();
    let handle_clone = handle.clone();

    handle.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
        // Prevent rapid toggle
        if is_toggling.swap(true, Ordering::SeqCst) {
            println!("[GlobalShortcut] Ignoring rapid toggle");
            return;
        }

        let is_visible = window_clone.is_visible().unwrap_or(false);
        println!("[GlobalShortcut] Toggle triggered, window visible: {}", is_visible);

        if is_visible {
            let _ = window_clone.hide();
            println!("[GlobalShortcut] Window hidden");
        } else {
            // 显示窗口前先定位到鼠标所在屏幕的中心偏上位置
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
                            (800i32, 600i32)
                        }
                    };

                    let actual_width = actual_size.0;
                    let actual_height = actual_size.1;

                    // 使用实际窗口尺寸计算位置
                    let x = target_center_x - actual_width / 2;
                    let y = target_center_y - actual_height / 2;

                    println!("[GlobalShortcut] Found monitor: {}x{} at ({}, {})", monitor_width, monitor_height, monitor_x, monitor_y);
                    println!("[GlobalShortcut] Monitor center: ({}, {})", center_x, center_y);
                    println!("[GlobalShortcut] Target center (offset -{}): ({}, {})", offset_y, target_center_x, target_center_y);
                    println!("[GlobalShortcut] Actual window size: {}x{}", actual_width, actual_height);
                    println!("[GlobalShortcut] Window position (top-left): ({}, {})", x, y);

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

                            let x = center_x - 800i32 / 2;
                            let y = center_y - 600i32 / 2;

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
            let _ = handle_clone.emit_to("main", "window-shown", ());
        }

        // Reset the flag after a short delay
        let flag = is_toggling.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            flag.store(false, Ordering::SeqCst);
        });
    }).map_err(|e| format!("Failed to register global shortcut: {}", e))?;

    // Save to settings
    let mut settings = load_settings(&handle)?;
    settings.global_hotkey = hotkey.clone();
    save_settings(&handle, &settings)?;

    println!("Hotkey reregistered successfully: {}", hotkey);

    Ok(())
}

/// Validate hotkey format
fn validate_hotkey(hotkey: &str) -> bool {
    let valid_modifiers = ["Cmd", "Ctrl", "Alt", "Shift", "Option", "Super"];
    let parts: Vec<&str> = hotkey.split('+').collect();

    if parts.is_empty() || parts.len() > 5 {
        return false;
    }

    // Check last part is a key (not a modifier)
    let last_part = parts.last().unwrap();
    if valid_modifiers.contains(&last_part) {
        return false;
    }

    // Check all but last are valid modifiers
    for part in &parts[..parts.len()-1] {
        if !valid_modifiers.contains(&part) {
            return false;
        }
    }

    true
}

/// Check for system hotkey conflicts (T182)
#[tauri::command]
pub fn check_hotkey_conflicts(hotkey: String) -> Result<Vec<String>, String> {
    let mut conflicts = Vec::new();

    // List of common system hotkeys that shouldn't be overridden
    let system_hotkeys = get_system_hotkeys();

    // Normalize the hotkey for comparison
    let normalized = normalize_hotkey(&hotkey);

    for system_hotkey in system_hotkeys {
        if normalized == normalize_hotkey(system_hotkey) {
            conflicts.push(system_hotkey.to_string());
        }
    }

    Ok(conflicts)
}

/// Get settings file path for debugging
#[tauri::command]
pub fn get_settings_file_path(handle: AppHandle) -> Result<String, String> {
    let path = get_settings_path(&handle)?;
    Ok(path.to_string_lossy().to_string())
}

/// Get list of system-reserved hotkeys
fn get_system_hotkeys() -> &'static [&'static str] {
    &[
        // macOS system shortcuts
        "Cmd+Space", "Cmd+Tab", "Cmd+Q", "Cmd+W", "Cmd+C", "Cmd+V",
        "Cmd+X", "Cmd+A", "Cmd+Z", "Cmd+Shift+Z", "Cmd+S", "Cmd+F",
        "Cmd+P", "Cmd+N", "Cmd+T", "Cmd+H", "Cmd+M", "Cmd+,",
        "Cmd+Option+Esc", "Cmd+Shift+3", "Cmd+Shift+4", "Cmd+Shift+5",
        // Windows/Linux system shortcuts
        "Ctrl+Esc", "Ctrl+Shift+Esc", "Ctrl+Alt+Delete",
        "Ctrl+Tab", "Ctrl+Shift+Tab", "Alt+Tab", "Alt+Shift+Tab",
        "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+A", "Ctrl+Z", "Ctrl+Y",
        "Ctrl+S", "Ctrl+F", "Ctrl+P", "Ctrl+N", "Ctrl+W", "Ctrl+Q",
        "PrntScrn", "Ctrl+PrntScrn", "Alt+PrntScrn",
    ]
}

/// Normalize hotkey string for comparison
fn normalize_hotkey(hotkey: &str) -> String {
    hotkey
        .replace("Command", "Cmd")
        .replace("Control", "Ctrl")
        .replace("Option", "Alt")
        .to_lowercase()
}
