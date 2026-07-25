use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PertePayload {
    pub type_perte: String, // "Standard", "Barre", "Chute"
    pub materiau_id: Option<i32>,
    pub chute_id: Option<i32>,
    pub quantite_ou_longueur: f64,
    pub raison: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoriquePerte {
    pub perte_id: i32,
    pub date_declaration: String,
    pub reference: String,
    pub designation: String,
    pub source_stock: String,
    pub raison: String,
    pub quantite_perdue: f64,
}
