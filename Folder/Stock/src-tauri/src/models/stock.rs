
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
    pub couleur: Option<String>,
    pub longueur_restante: f64,
    pub statut: String,
    pub client_origine: Option<String>,
    pub categorie_emplacement: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddChutePayload {
    pub materiau_id: i32,
    pub code_projet: Option<String>,
    pub longueur_restante: f64,
    pub quantite: Option<i32>,
    pub categorie_emplacement: Option<String>,
}
