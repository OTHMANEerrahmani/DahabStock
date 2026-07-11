
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompatibleChute {
    pub chute_id: i32,
    pub longueur: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChuteInfo {
    pub chute_id: i32,
    pub date_creation: String,
    pub reference: String,
    pub designation: String,
    pub longueur_restante: f64,
    pub statut: String,
}
