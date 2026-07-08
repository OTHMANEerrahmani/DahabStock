pub mod database;
pub mod models;
pub mod repositories;
pub mod services;
pub mod commands;
pub mod tests;

use commands::dashboard::get_dashboard_stats;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_dashboard_stats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
