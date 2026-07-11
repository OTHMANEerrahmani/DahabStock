use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Projet {
    pub id: i32,
    pub code_projet: String,
    pub statut: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjetStats {
    pub id: i32,
    pub code_projet: String,
    pub statut: String,
    pub total_pieces: i32,
    pub cout_total: f64,
}
