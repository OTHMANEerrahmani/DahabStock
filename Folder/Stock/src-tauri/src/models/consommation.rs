use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Consommation {
    pub consommation_id: Option<i32>,
    pub projet_id: i32,
    pub materiau_id: i32,
    pub source_consommation: String,
    pub quantite_utilisee: Option<f64>,
    pub longueur_utilisee: Option<f64>,
    pub chute_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConsommationBarrePayload {
    pub code_projet: String,
    pub materiau_id: i32,
    pub quantite: i32,
    pub preneur: String,
    pub date_consommation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LigneConsommationPayload {
    pub type_materiau: String,
    pub materiau_id: i32,
    pub quantite: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConsommationMultiPayload {
    pub code_projet: String,
    pub preneur: String,
    pub date_consommation: String,
    pub lignes: Vec<LigneConsommationPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConsommationStandardPayload {
    pub code_projet: String,
    pub materiau_id: i32,
    pub quantite: i32,
    pub preneur: String,
    pub date_consommation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConsommationChutePayload {
    pub code_projet: String,
    pub chute_id: i32,
    pub preneur: String,
    pub date_consommation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoriqueConsommation {
    pub id: i32,
    pub date: String,
    pub reference: String,
    pub designation: String,
    pub projet: String,
    pub quantite_utilisee: f64,
    pub longueur_utilisee: f64,
    pub preneur: String,
    pub cout_total: f64,
    pub source: String,
    pub operation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmitConsommationResponse {
    pub message: String,
    pub operation_id: String,
}
