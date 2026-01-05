// Modules
mod db;
mod cmds;
mod models;
mod services;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use cmds::app::{AppState, get_installed_apps, launch_app, track_app_usage, get_app_icon, get_app_icon_nsworkspace};
use cmds::search::{SearchState, unified_search, get_search_stats, search_files, search_browser_data, update_browser_cache, index_files, get_file_index_stats, start_file_indexer, stop_file_indexer};
use cmds::clipboard::{get_clipboard_history, get_clipboard_item, paste_clipboard_item, delete_clipboard_item, clear_clipboard_history, get_clipboard_settings, set_clipboard_settings, search_clipboard};
use cmds::plugins::{
    plugin_list, install_plugin, uninstall_plugin, enable_plugin, disable_plugin,
    get_plugin_manifest, reload_plugin, grant_plugin_permission, revoke_plugin_permission,
    get_plugin_permissions, set_plugin_setting, get_plugin_setting, validate_plugin_manifest,
    check_plugin_updates, download_plugin, rate_plugin,
    // New commands
    get_plugin_health, check_plugin_health, get_plugin_usage_stats,
    bulk_enable_plugins, bulk_disable_plugins, bulk_uninstall_plugins,
    plugin_validate_package, plugin_extract_package, plugin_install, plugin_get_install_status,
    plugin_cancel_install,
    plugin_validate_package_from_buffer, plugin_extract_package_from_buffer,
    // Enable/Disable/Uninstall commands (US3/US4)
    plugin_enable, plugin_disable, plugin_uninstall,
    // Plugin abbreviation commands
    get_plugin_abbreviations, save_plugin_abbreviations,
    set_plugin_abbreviation, remove_plugin_abbreviation,
};
use cmds::shell::{open_url, get_default_browser};
use cmds::marketplace::{marketplace_list, marketplace_search, marketplace_install, marketplace_check_updates, marketplace_get_plugin, marketplace_submit_rating, marketplace_report_issue};
use cmds::settings::{get_settings, get_setting, set_setting, update_settings, reset_settings, init_preferences, get_hotkey, set_hotkey, check_hotkey_conflicts, get_settings_file_path};
use cmds::window::{save_window_state, restore_window_state, get_window_info, set_always_on_top, set_window_size, show_results_window, hide_results_window, update_results_window_size, write_debug_log};
use cmds::performance::{PerformanceState, get_performance_metrics, check_performance_requirements, record_performance_event, get_average_search_time};
use cmds::abbreviation::{get_abbreviation_config, save_abbreviation_config, add_abbreviation, update_abbreviation, delete_abbreviation, export_abbreviation_config, import_abbreviation_config};

/// Parse hotkey string (e.g., "Cmd+Space", "Ctrl+Shift+A") into a Shortcut
fn parse_hotkey(hotkey: &str) -> Result<Shortcut, String> {
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

// Show settings window
#[tauri::command]
fn show_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings_window) = app.get_webview_window("settings") {
        // Center settings window on screen
        let monitor = settings_window.current_monitor()
            .map_err(|e| e.to_string())?
            .ok_or("No monitor found")?;

        let screen_size = monitor.size();
        let window_size = settings_window.outer_size().map_err(|e| e.to_string())?;

        // Calculate center position
        let x = (screen_size.width as i32 - window_size.width as i32) / 2;
        let y = (screen_size.height as i32 - window_size.height as i32) / 2;

        settings_window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;

        // Hide main window
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.hide();
        }

        // Show settings window
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Hide settings window
#[tauri::command]
fn hide_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // Hide settings window
    if let Some(settings_window) = app.get_webview_window("settings") {
        settings_window.hide().map_err(|e| e.to_string())?;
    }

    // Show main window
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Show plugin popup - universal popup for all plugins
#[tauri::command]
fn show_plugin_popup(app: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    println!("[show_plugin_popup] Called with data: {}", data);

    if let Some(popup_window) = app.get_webview_window("plugin-popup") {
        println!("[show_plugin_popup] Found plugin-popup window");

        // Emit popup data to window
        popup_window.emit("plugin-popup", &data).map_err(|e| e.to_string())?;
        println!("[show_plugin_popup] Emitted plugin-popup event");

        // Center popup window on screen
        let monitor = popup_window.current_monitor()
            .map_err(|e| e.to_string())?
            .ok_or("No monitor found")?;

        let screen_size = monitor.size();
        let window_size = popup_window.outer_size().map_err(|e| e.to_string())?;

        // Calculate center position
        let x = (screen_size.width as i32 - window_size.width as i32) / 2;
        let y = (screen_size.height as i32 - window_size.height as i32) / 2;

        popup_window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;

        // Hide main and results windows
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.hide();
        }
        if let Some(results_window) = app.get_webview_window("results") {
            let _ = results_window.hide();
        }

        // Show popup window
        popup_window.show().map_err(|e| e.to_string())?;
        popup_window.set_focus().map_err(|e| e.to_string())?;

        println!("[show_plugin_popup] Popup window shown successfully");
    } else {
        println!("[show_plugin_popup] ERROR: Plugin popup window not found!");
        return Err("Plugin popup window not found".to_string());
    }
    Ok(())
}

// Hide plugin popup
#[tauri::command]
fn hide_plugin_popup(app: tauri::AppHandle) -> Result<(), String> {
    println!("[hide_plugin_popup] Hiding plugin popup");

    // Hide popup window
    if let Some(popup_window) = app.get_webview_window("plugin-popup") {
        popup_window.hide().map_err(|e| e.to_string())?;
    }

    // Show main window
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }

    println!("[hide_plugin_popup] Plugin popup hidden");
    Ok(())
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
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize app monitor state
            app.manage(AppState {
                app_monitor: std::sync::Mutex::new(services::app_monitor::AppMonitor::new()),
            });

            // Initialize search state
            app.manage(SearchState {
                app_monitor: std::sync::Mutex::new(services::app_monitor::AppMonitor::new()),
                file_indexer: std::sync::Mutex::new(None),
            });

            // Initialize performance monitor state
            app.manage(PerformanceState {
                monitor: std::sync::Arc::new(std::sync::Mutex::new(services::performance::PerformanceMonitor::new())),
            });

            // Get the main window
            let window = app.get_webview_window("main").unwrap();

            // Load hotkey from settings or use default
            let settings_path = app.path().app_config_dir()
                .map_err(|e| format!("Failed to get config dir: {}", e))?;
            let settings_file = settings_path.join("settings.json");

            let hotkey_str = if settings_file.exists() {
                // Read settings file to get hotkey
                use std::fs;
                if let Ok(content) = fs::read_to_string(&settings_file) {
                    if let Ok(settings) = serde_json::from_str::<crate::models::preferences::AppSettings>(&content) {
                        settings.global_hotkey
                    } else {
                        // Default based on platform
                        #[cfg(target_os = "macos")]
                        { "Cmd+Shift+K".to_string() }
                        #[cfg(not(target_os = "macos"))]
                        { "Ctrl+Shift+K".to_string() }
                    }
                } else {
                    #[cfg(target_os = "macos")]
                    { "Cmd+Shift+K".to_string() }
                    #[cfg(not(target_os = "macos"))]
                    { "Ctrl+Shift+K".to_string() }
                }
            } else {
                #[cfg(target_os = "macos")]
                { "Cmd+Shift+K".to_string() }
                #[cfg(not(target_os = "macos"))]
                { "Ctrl+Shift+K".to_string() }
            };

            println!("[GlobalShortcut] Registering hotkey: {}", hotkey_str);

            // Parse hotkey string and register
            let shortcut = parse_hotkey(&hotkey_str)?;

            use std::sync::atomic::{AtomicBool, Ordering};
            use std::sync::Arc;

            let is_toggling = Arc::new(AtomicBool::new(false));
            let window_clone = window.clone();

            app.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
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
            save_window_state,
            restore_window_state,
            get_window_info,
            set_always_on_top,
            set_window_size,
            show_results_window,
            hide_results_window,
            update_results_window_size,
            write_debug_log,
            // App commands
            get_installed_apps,
            launch_app,
            track_app_usage,
            get_app_icon,
            get_app_icon_nsworkspace,
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
            // Plugin commands
            plugin_list,
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
            check_plugin_updates,
            download_plugin,
            rate_plugin,
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
            // Enable/Disable/Uninstall commands (US3/US4)
            plugin_enable,
            plugin_disable,
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
            // Marketplace commands
            marketplace_list,
            marketplace_search,
            marketplace_install,
            marketplace_check_updates,
            marketplace_get_plugin,
            marketplace_submit_rating,
            marketplace_report_issue,
            // Settings commands
            get_settings,
            get_setting,
            set_setting,
            update_settings,
            reset_settings,
            init_preferences,
            get_hotkey,
            set_hotkey,
            check_hotkey_conflicts,
            get_settings_file_path,
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
