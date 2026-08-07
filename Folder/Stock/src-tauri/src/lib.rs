pub mod database;
pub mod models;
pub mod repositories;
pub mod services;
pub mod controllers;
pub mod tests;
pub mod utils;

use controllers::dashboard::get_dashboard_stats;
use controllers::reception::{get_fournisseurs, get_materiaux, submit_reception, add_fournisseur, get_historique_receptions, update_prix_reception};
use controllers::catalogue::{get_catalogue_complet, add_article_standard, add_barre_aluminium};
use controllers::consommation::{get_projets, get_historique_consommations, submit_consommation_barre, submit_consommation_standard, submit_consommation_chute, get_consommations_by_projet};
use controllers::stock::{get_stock_chutes, add_chute_manually};

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
            controllers::consommation::get_historique_consommations,
            controllers::consommation::get_consommations_by_projet,
            controllers::consommation::submit_consommation_barre,
            controllers::consommation::submit_consommation_standard,
            controllers::consommation::submit_consommation_chute,
            controllers::perte::submit_perte,
            controllers::perte::get_historique_pertes,
            controllers::projet::get_projets_suivi,
            controllers::projet::update_projet_statut,
            get_stock_chutes,
            add_chute_manually
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
