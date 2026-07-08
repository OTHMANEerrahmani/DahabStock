
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Perte {
    pub perte_id: Option<i32>,
    pub materiau_id: i32,
    pub source_stock: String,
    pub raison: String,
    pub quantite_perdue: i32,
}
