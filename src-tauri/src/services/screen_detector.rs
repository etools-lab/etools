use tauri::{AppHandle, Emitter, Manager};
use crate::models::ScreenInfo;

/// Detects screen information using Tauri's window API
pub async fn detect_screen_info(app: &AppHandle) -> Result<ScreenInfo, String> {
    let window = app.get_webview_window("main")
        .ok_or("Window 'main' not found")?;

    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No monitor found")?;

    let size = monitor.size();
    let scale_factor = monitor.scale_factor();

    // Calculate available size (subtract system UI)
    // On macOS: menu bar is typically ~25px, dock is configurable
    // We'll use a conservative estimate
    let system_ui_height = if cfg!(target_os = "macos") { 80 } else { 50 };

    let screen_info = ScreenInfo {
        screen_width: size.width,
        screen_height: size.height,
        available_width: size.width,
        available_height: size.height.saturating_sub(system_ui_height),
        scale_factor,
    };

    // Validate
    screen_info.validate()?;

    Ok(screen_info)
}

/// Get screen info with fallback to defaults if detection fails
#[allow(dead_code)]
pub async fn get_screen_info_with_fallback(app: &AppHandle) -> ScreenInfo {
    match detect_screen_info(app).await {
        Ok(info) => info,
        Err(e) => {
            eprintln!("Screen detection failed, using defaults: {}", e);
            // Fallback to safe defaults (FR-033)
            ScreenInfo {
                screen_width: 1920,
                screen_height: 1080,
                available_width: 1920,
                available_height: 1040,
                scale_factor: 1.0,
            }
        }
    }
}

/// Emit screen changed event when resolution or display configuration changes
#[allow(dead_code)]
pub fn emit_screen_changed(app: &AppHandle, old_info: Option<ScreenInfo>, new_info: &ScreenInfo) {
    use crate::types::ScreenChangedPayload;

    let change_type = if let Some(ref old) = old_info {
        if old.screen_width != new_info.screen_width || old.screen_height != new_info.screen_height {
            "resolution"
        } else if old.scale_factor != new_info.scale_factor {
            "scale_factor"
        } else {
            "display_connect"
        }
    } else {
        "display_connect"
    };

    let payload = ScreenChangedPayload {
        old_screen_info: old_info,
        new_screen_info: new_info.clone(),
        change_type: change_type.to_string(),
    };

    let _ = app.emit("screen:changed", &payload);
}
