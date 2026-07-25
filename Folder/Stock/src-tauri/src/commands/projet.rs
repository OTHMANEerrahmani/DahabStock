use crate::database::connection::get_connection;
use serde::{Deserialize, Serialize};
use crate::repositories::projet_repository::ProjetRepository;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateStatutPayload {
    pub projet_id: i32,
    pub statut: String,
}

#[tauri::command]
pub async fn get_projets_suivi() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    match ProjetRepository::get_projets_suivi(&mut client).await {
        Ok(data) => {
            let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn update_projet_statut(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: UpdateStatutPayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    match ProjetRepository::update_projet_statut(&mut client, data.projet_id, &data.statut).await {
        Ok(_) => {
            let res = ApiResponse { status: "success".to_string(), data: Some("Statut mis à jour"), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}
