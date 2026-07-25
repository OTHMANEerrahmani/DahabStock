pub mod database;
pub mod models;
pub mod repositories;
pub mod services;
pub mod commands;
pub mod tests;
pub mod utils;

use commands::dashboard::get_dashboard_stats;
use commands::reception::{get_fournisseurs, get_materiaux, submit_reception, add_fournisseur, get_historique_receptions, update_prix_reception};
use commands::catalogue::{get_catalogue_complet, add_article_standard, add_barre_aluminium};
use commands::consommation::{get_projets, get_historique_consommations, submit_consommation_barre, submit_consommation_standard};
use commands::stock::get_stock_chutes;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_dashboard_stats, 
            get_fournisseurs, 
            get_materiaux, 
            submit_reception,
            add_fournisseur,
            get_historique_receptions,
            update_prix_reception,
            get_catalogue_complet,
            add_article_standard,
            add_barre_aluminium,
            get_projets,
            commands::consommation::get_historique_consommations,
            commands::consommation::get_consommations_by_projet,
            commands::consommation::submit_consommation_barre,
            commands::consommation::submit_consommation_standard,
            commands::perte::submit_perte,
            commands::perte::get_historique_pertes,
            commands::projet::get_projets_suivi,
            commands::projet::update_projet_statut,
            get_stock_chutes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
