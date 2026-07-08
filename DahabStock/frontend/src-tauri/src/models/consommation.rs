
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
