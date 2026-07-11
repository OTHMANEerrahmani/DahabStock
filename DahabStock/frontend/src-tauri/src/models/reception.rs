
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Fournisseur {
    pub fournisseur_id: i32,
    pub nom: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MateriauReception {
    pub materiau_id: i32,
    pub reference: String,
    pub designation: String,
    pub type_article: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LigneReceptionPayload {
    pub materiau_id: i32,
    pub quantite_recue: f64,
    pub prix_achat: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BonReceptionPayload {
    pub fournisseur_id: i32,
    pub numero_br: String,
    pub lignes: Vec<LigneReceptionPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoriqueReception {
    pub id: i32,
    pub date: String,
    pub reference: String,
    pub designation: String,
    pub fournisseur: String,
    pub quantite: f64,
    pub prix_unitaire: f64,
    pub prix_total: f64,
}
