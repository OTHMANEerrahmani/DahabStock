
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MouvementStock {
    pub mouvement_id: Option<i32>,
    pub materiau_id: i32,
    pub type_mouvement: String,
    pub quantite: f64,
    pub reference_operation: Option<String>,
    pub consommation_id: Option<i32>,
    pub perte_id: Option<i32>,
    pub bon_reception_id: Option<i32>,
}
