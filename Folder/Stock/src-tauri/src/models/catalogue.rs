
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ArticleStandardPayload {
    pub reference: String,
    pub designation: String,
    pub categorie: String,
    pub prix_unitaire: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BarreAluminiumPayload {
    pub reference: String,
    pub designation: String,
    pub couleur: String,
    pub longueur: f64,
    pub prix_par_metre: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CatalogueItem {
    pub materiau_id: i32,
    pub reference: String,
    pub designation: String,
    pub type_item: String,
    pub categorie_ou_couleur: String,
    pub stock_actuel: i32,
    pub longueur_standard: Option<f64>,
}
