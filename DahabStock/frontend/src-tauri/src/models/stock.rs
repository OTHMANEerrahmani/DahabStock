
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompatibleChute {
    pub chute_id: i32,
    pub longueur: f64,
}
