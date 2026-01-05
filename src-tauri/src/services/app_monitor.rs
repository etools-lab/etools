/**
 * Application Monitor Service
 * Discovers installed applications on macOS, Windows, and Linux
 */

use crate::models::app::ApplicationEntry;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Application cache
pub struct AppMonitor {
    cache: HashMap<String, ApplicationEntry>,
}

impl AppMonitor {
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
        }
    }

    /// Scan for installed applications
    pub fn scan_apps(&mut self) -> Vec<ApplicationEntry> {
        let mut apps = Vec::new();

        // Platform-specific discovery
        #[cfg(target_os = "macos")]
        {
            apps.extend(self.scan_macos_apps());
        }

        #[cfg(target_os = "windows")]
        {
            apps.extend(self.scan_windows_apps());
        }

        #[cfg(target_os = "linux")]
        {
            apps.extend(self.scan_linux_apps());
        }

        // Update cache
        for app in &apps {
            self.cache.insert(app.id.clone(), app.clone());
        }

        apps
    }

    #[cfg(target_os = "macos")]
    fn scan_macos_apps(&self) -> Vec<ApplicationEntry> {
        let mut apps = Vec::new();
        let search_paths = vec![
            PathBuf::from("/Applications"),
            PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Applications"),
        ];

        for base_dir in search_paths {
            if let Ok(entries) = fs::read_dir(&base_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("app") {
                        if let Some(app) = self.parse_macos_app(&path) {
                            apps.push(app);
                        }
                    }
                }
            }
        }

        apps
    }

    #[cfg(target_os = "macos")]
    fn parse_macos_app(&self, app_path: &Path) -> Option<ApplicationEntry> {
        let name = app_path.file_stem()?.to_str()?.to_string();
        let contents_path = app_path.join("Contents");
        let info_plist_path = contents_path.join("Info.plist");

        // Parse Info.plist for display name
        let display_name = self.read_plist_value(&info_plist_path, "CFBundleName")
            .unwrap_or_else(|| name.clone());

        // Find executable
        let executable_path = self.read_plist_value(&info_plist_path, "CFBundleExecutable")
            .map(|exe| contents_path.join("MacOS").join(exe))
            .unwrap_or_else(|| app_path.to_path_buf());

        // Don't extract icon during scan to avoid blocking
        // Icon will be loaded on-demand via NSWorkspace API
        let icon = None;

        // Build alternate names: include .app filename if different from display name
        let alternate_names = if name != display_name {
            Some(vec![name.clone()])
        } else {
            None
        };

        Some(ApplicationEntry {
            id: hash_string(&executable_path.to_string_lossy()),
            name: display_name,
            executable_path: executable_path.to_string_lossy().to_string(),
            app_path: Some(app_path.to_string_lossy().to_string()),
            icon,
            usage_count: 0,
            last_launched: None,
            platform: "macos".to_string(),
            alternate_names,
        })
    }

    #[cfg(target_os = "macos")]
    fn read_plist_value(&self, plist_path: &Path, key: &str) -> Option<String> {
        // Simple plist parsing (for production, use a proper plist library)
        if let Ok(content) = fs::read_to_string(plist_path) {
            // Look for <key>{key}</key>\s*<string>(.*?)</string>
            let pattern = format!("<key>{}</key>\\s*<string>(.*?)</string>", regex::escape(key));
            if let Ok(re) = regex::Regex::new(&pattern) {
                if let Some(caps) = re.captures(&content) {
                    return caps.get(1).map(|m| m.as_str().to_string());
                }
            }
        }
        None
    }

    /// Extract app icon from .app bundle using NSWorkspace API
    /// This is much faster than using iconutil command
    #[cfg(target_os = "macos")]
    fn extract_app_icon(&self, contents_path: &Path, _info_plist_path: &Path) -> Option<String> {
        use objc::runtime::Object;
        use objc::{class, msg_send, sel, sel_impl};

        // Reconstruct the full .app path from contents_path
        let app_path = contents_path.parent()?.parent()?;
        let app_path_str = app_path.to_str()?;

        unsafe {
            // Get NSWorkspace shared workspace
            let workspace = class!(NSWorkspace);
            let shared_workspace: *mut Object = msg_send![workspace, sharedWorkspace];

            // Create NSString from path
            let ns_string_class = class!(NSString);
            let ns_path: *mut Object = msg_send![
                ns_string_class,
                stringWithUTF8String: app_path_str
            ];

            // Get icon for file using NSWorkspace
            let icon: *mut Object = msg_send![
                shared_workspace,
                iconForFile: ns_path
            ];

            if icon.is_null() {
                return None;
            }

            // Convert NSImage to TIFF representation
            let tiff_data: *mut Object = msg_send![
                icon,
                TIFFRepresentation
            ];

            if tiff_data.is_null() {
                return None;
            }

            // Get NSData bytes and length
            let bytes: *const u8 = msg_send![tiff_data, bytes];
            let length: usize = msg_send![tiff_data, length];

            if bytes.is_null() || length == 0 {
                return None;
            }

            // Create a slice from the raw pointer
            let slice = std::slice::from_raw_parts(bytes, length);

            // Convert to base64
            use base64::prelude::*;
            let base64_string = BASE64_STANDARD.encode(slice);

            // Return as data URL (TIFF format)
            Some(format!("data:image/tiff;base64,{base64_string}"))
        }
    }

    #[cfg(target_os = "windows")]
    fn scan_windows_apps(&self) -> Vec<ApplicationEntry> {
        let mut apps = Vec::new();

        // Scan start menu
        let start_menu_paths = vec![
            PathBuf::from(std::env::var("PROGRAMDATA").unwrap_or_default())
                .join("Microsoft\\Windows\\Start Menu\\Programs"),
            PathBuf::from(std::env::var("APPDATA").unwrap_or_default())
                .join("Microsoft\\Windows\\Start Menu\\Programs"),
        ];

        for base_dir in start_menu_paths {
            if let Ok(entries) = fs::read_dir(&base_dir) {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_dir() {
                            apps.extend(self.scan_windows_directory(&entry.path()));
                        } else if entry.path().extension().and_then(|s| s.to_str()) == Some("lnk") {
                            if let Some(app) = self.parse_windows_lnk(&entry.path()) {
                                apps.push(app);
                            }
                        }
                    }
                }
            }
        }

        apps
    }

    #[cfg(target_os = "windows")]
    fn scan_windows_directory(&self, dir: &Path) -> Vec<ApplicationEntry> {
        let mut apps = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("lnk") {
                    if let Some(app) = self.parse_windows_lnk(&path) {
                        apps.push(app);
                    }
                }
            }
        }
        apps
    }

    #[cfg(target_os = "windows")]
    fn parse_windows_lnk(&self, _lnk_path: &Path) -> Option<ApplicationEntry> {
        // TODO: Parse .lnk files to extract target path
        // For now, return None
        None
    }

    #[cfg(target_os = "linux")]
    fn scan_linux_apps(&self) -> Vec<ApplicationEntry> {
        let mut apps = Vec::new();
        let data_dirs = vec![
            PathBuf::from("/usr/share/applications"),
            PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".local/share/applications"),
        ];

        for base_dir in data_dirs {
            if let Ok(entries) = fs::read_dir(&base_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("desktop") {
                        if let Some(app) = self.parse_linux_desktop(&path) {
                            apps.push(app);
                        }
                    }
                }
            }
        }

        apps
    }

    #[cfg(target_os = "linux")]
    fn parse_linux_desktop(&self, desktop_path: &Path) -> Option<ApplicationEntry> {
        if let Ok(content) = fs::read_to_string(desktop_path) {
            let mut name = None;
            let mut exec = None;

            for line in content.lines() {
                if line.starts_with("Name=") {
                    name = Some(line.trim_start_matches("Name=").to_string());
                } else if line.starts_with("Exec=") {
                    exec = Some(line.trim_start_matches("Exec=").to_string());
                }
            }

            if let (Some(n), Some(e)) = (name, exec) {
                return Some(ApplicationEntry {
                    id: hash_string(&e),
                    name: n,
                    executable_path: e,
                    icon: None,
                    usage_count: 0,
                    last_launched: None,
                    platform: "linux".to_string(),
                });
            }
        }
        None
    }

    /// Get app from cache by ID
    pub fn get_app(&self, id: &str) -> Option<&ApplicationEntry> {
        self.cache.get(id)
    }
}

impl Default for AppMonitor {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple hash function for strings
fn hash_string(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
