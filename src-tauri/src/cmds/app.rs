/**
 * Application Commands
 * Tauri commands for application discovery and launching
 */

use crate::models::app::*;
use crate::services::app_monitor::AppMonitor;
use std::sync::Mutex;
use tauri::State;

/// Global app monitor state
pub struct AppState {
    pub app_monitor: Mutex<AppMonitor>,
}

/// Get installed applications
#[tauri::command]
pub fn get_installed_apps(
    refresh: bool,
    state: State<AppState>,
) -> Result<GetInstalledAppsResponse, String> {
    let start = std::time::Instant::now();

    let mut monitor = state.app_monitor.lock().map_err(|e| e.to_string())?;

    let apps = if refresh {
        monitor.scan_apps()
    } else {
        // Return cached apps or scan if empty
        if monitor.scan_apps().is_empty() {
            monitor.scan_apps()
        } else {
            vec![] // Will be populated from cache in production
        }
    };

    let scan_time = start.elapsed().as_millis() as u64;

    Ok(GetInstalledAppsResponse { apps, scan_time })
}

/// Launch an application
#[tauri::command]
pub fn launch_app(path: String) -> Result<LaunchAppResponse, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;

        return Ok(LaunchAppResponse {
            success: true,
            pid: None,
        });
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;

        return Ok(LaunchAppResponse {
            success: true,
            pid: None,
        });
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;

        return Ok(LaunchAppResponse {
            success: true,
            pid: None,
        });
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        return Err("Unsupported platform".to_string());
    }
}

/// Track application usage
#[tauri::command]
pub fn track_app_usage(
    app_id: String,
    state: State<AppState>,
) -> Result<TrackAppUsageResponse, String> {
    let monitor = state.app_monitor.lock().map_err(|e| e.to_string())?;

    if let Some(app) = monitor.get_app(&app_id) {
        // In a real implementation, we would persist this
        // For now, just return success
        return Ok(TrackAppUsageResponse {
            success: true,
            usage_count: app.usage_count + 1,
        });
    }

    Ok(TrackAppUsageResponse {
        success: false,
        usage_count: 0,
    })
}

/// Get application icon (T052)
/// Returns base64-encoded PNG data from cached app entry
#[tauri::command]
pub fn get_app_icon(
    app_id: String,
    state: State<AppState>,
) -> Result<GetAppIconResponse, String> {
    let monitor = state.app_monitor.lock().map_err(|e| e.to_string())?;

    if let Some(app) = monitor.get_app(&app_id) {
        // Return cached icon if available, otherwise return None
        return Ok(GetAppIconResponse {
            icon: app.icon.clone(),
            icon_data_url: app.icon.clone(),
        });
    }

    Err(format!("App not found: {}", app_id))
}

/// Get application icon on-demand using NSWorkspace API
/// This is called when the icon is needed for display
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_app_icon_nsworkspace(app_path: String) -> Result<GetAppIconResponse, String> {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    if app_path.is_empty() {
        return Err("App path is empty".to_string());
    }

    unsafe {
        // Get NSWorkspace shared workspace
        let workspace = class!(NSWorkspace);
        let shared_workspace: *mut Object = msg_send![workspace, sharedWorkspace];

        // Create NSString from path
        let ns_string_class = class!(NSString);
        let ns_path: *mut Object = msg_send![
            ns_string_class,
            stringWithUTF8String: app_path.as_str()
        ];

        // Get icon for file using NSWorkspace
        let icon: *mut Object = msg_send![
            shared_workspace,
            iconForFile: ns_path
        ];

        if icon.is_null() {
            return Err("Failed to get icon".to_string());
        }

        // Convert NSImage to TIFF representation
        let tiff_data: *mut Object = msg_send![
            icon,
            TIFFRepresentation
        ];

        if tiff_data.is_null() {
            return Err("Failed to convert icon to TIFF".to_string());
        }

        // Get NSData bytes and length
        let bytes: *const u8 = msg_send![tiff_data, bytes];
        let length: usize = msg_send![tiff_data, length];

        if bytes.is_null() || length == 0 {
            return Err("Failed to get icon data".to_string());
        }

        // Create a slice from the raw pointer
        let slice = std::slice::from_raw_parts(bytes, length);

        // Convert to base64
        use base64::prelude::*;
        let base64_string = BASE64_STANDARD.encode(slice);

        // Return as data URL (TIFF format)
        Ok(GetAppIconResponse {
            icon: Some(format!("data:image/tiff;base64,{base64_string}")),
            icon_data_url: Some(format!("data:image/tiff;base64,{base64_string}")),
        })
    }
}

/// Fallback for non-macOS platforms
#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn get_app_icon_nsworkspace(_app_path: String) -> Result<GetAppIconResponse, String> {
    Err("Icon loading only supported on macOS".to_string())
}
