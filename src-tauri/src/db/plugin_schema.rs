/**
 * Plugin Management Database Schema
 * Database tables and migrations for plugin management
 *
 * Note: Schema functions are kept for future database management needs.
 * Currently using in-memory plugin state, but these functions provide
 * a foundation for future persistent storage.
 */
use rusqlite::{Connection, Result as SqliteResult};

/// Create plugin management tables
#[allow(dead_code)]
pub fn create_plugin_tables(conn: &Connection) -> SqliteResult<()> {
    // Create plugins table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS plugins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            description TEXT,
            author TEXT,
            enabled BOOLEAN NOT NULL DEFAULT 0,
            permissions TEXT NOT NULL DEFAULT '[]',
            entry_point TEXT NOT NULL,
            triggers TEXT NOT NULL DEFAULT '[]',
            settings TEXT NOT NULL DEFAULT '{}',
            health_status TEXT NOT NULL DEFAULT 'unknown',
            health_message TEXT,
            health_last_checked INTEGER NOT NULL,
            health_errors TEXT NOT NULL DEFAULT '[]',
            usage_last_used INTEGER,
            usage_count INTEGER NOT NULL DEFAULT 0,
            usage_last_execution_time INTEGER,
            usage_average_execution_time INTEGER,
            installed_at INTEGER NOT NULL,
            install_path TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'local'
        )",
[],
    )?;

    // Create plugin_config table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS plugin_config (
            plugin_id TEXT PRIMARY KEY,
            enabled BOOLEAN NOT NULL DEFAULT 0,
            granted_permissions TEXT NOT NULL DEFAULT '[]',
            settings TEXT NOT NULL DEFAULT '{}',
            auto_update BOOLEAN NOT NULL DEFAULT 0,
            update_channel TEXT NOT NULL DEFAULT 'stable'
        )",
[],
    )?;

    // Create plugin_events table for auditing
    conn.execute(
        "CREATE TABLE IF NOT EXISTS plugin_events (
            id TEXT PRIMARY KEY,
            plugin_id TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            data TEXT,
            error TEXT,
            FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
        )",
[],
    )?;

    // Create bulk_operations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS bulk_operations (
            id TEXT PRIMARY KEY,
            operation_type TEXT NOT NULL,
            target_plugin_ids TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            results TEXT NOT NULL DEFAULT '[]',
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            FOREIGN KEY (target_plugin_ids) REFERENCES plugins(id) ON DELETE CASCADE
        )",
[],
    )?;

    // Create indexes for better performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plugins_enabled ON plugins(enabled)",
[],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plugins_installed_at ON plugins(installed_at)",
[],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plugin_events_plugin_id ON plugin_events(plugin_id)",
[],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_plugin_events_timestamp ON plugin_events(timestamp)",
[],
    )?;

    Ok(())
}

/// Create triggers for data consistency
#[allow(dead_code)]
pub fn create_plugin_triggers(conn: &Connection) -> SqliteResult<()> {
    // Trigger to automatically update health_last_checked when plugin health is accessed
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS update_health_check
        AFTER UPDATE ON plugins
        WHEN health_status IS 'healthy'
        BEGIN
            UPDATE plugins SET health_last_checked = strftime('%s', 'now') WHERE id = NEW.id;
        END",
[],
    )?;

    // Trigger to automatically update usage stats when plugin is used
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS update_usage_stats
        AFTER INSERT ON plugin_events
        WHEN NEW.type = 'plugin_used'
        BEGIN
            UPDATE plugins SET 
                usage_last_used = NEW.timestamp,
                usage_count = CASE 
                    WHEN usage_count IS NULL THEN 1 
                    ELSE usage_count + 1 
                END,
                usage_last_execution_time = NEW.timestamp
            WHERE id = NEW.plugin_id;
        END",
[],
    )?;

    Ok(())
}

/// Migration functions for schema updates
#[allow(dead_code)]
pub fn migrate_to_v2(conn: &Connection) -> SqliteResult<()> {
    // Example migration for adding new columns
    let add_columns = vec![
        "ALTER TABLE plugins ADD COLUMN source TEXT DEFAULT 'local'",
        "ALTER TABLE plugins ADD COLUMN install_path TEXT",
    ];

    for sql in add_columns {
        match conn.execute(sql, []) {
            Ok(_) => {} // Column added successfully
            Err(e) => {
                // Check if column already exists
                if !e.to_string().contains("duplicate column name") {
                    return Err(e);
                }
            }
        }
    }

    Ok(())
}

/// Get database statistics for monitoring
#[allow(dead_code)]
pub fn get_database_stats(conn: &Connection) -> SqliteResult<DatabaseStats> {
    let plugin_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM plugins", [], |row| row.get(0))?;

    let enabled_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM plugins WHERE enabled = 1",
[],
        |row| row.get(0),
    )?;

    let recent_installations: i64 = conn.query_row(
        "SELECT COUNT(*) FROM plugins WHERE installed_at > strftime('%s', 'now', '-7 days')",
[],
        |row| row.get(0),
    )?;

    Ok(DatabaseStats {
        total_plugins: plugin_count,
        enabled_plugins: enabled_count,
        recent_installations: recent_installations,
    })
}

/// Database statistics
#[derive(Debug, Clone)]
pub struct DatabaseStats {
    pub total_plugins: i64,
    pub enabled_plugins: i64,
    pub recent_installations: i64,
}

/// Initialize database with default data
#[allow(dead_code)]
pub fn initialize_default_data(conn: &Connection) -> SqliteResult<()> {
    // Create default plugin configuration
    conn.execute(
        "INSERT OR IGNORE INTO plugin_config (plugin_id, enabled, granted_permissions, settings)
        VALUES ('core', 1, '[]', '{}')",
[],
    )?;

    Ok(())
}
