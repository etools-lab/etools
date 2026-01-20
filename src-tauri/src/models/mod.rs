pub mod app;
pub mod clipboard;
pub mod plugin;
pub mod plugin_metadata;
pub mod preferences;
pub mod screen_info;
pub mod view_config;
pub mod window_layout;

// pub use plugin_metadata::EtoolsMetadata;  // 暂时注释，未使用
pub use screen_info::ScreenInfo;
pub use view_config::ViewConfig;
pub use window_layout::CalculatedWindowLayout;
