
use serde::Serialize;
use crate::database::connection::get_connection;
use crate::models::reception::{Fournisseur, MateriauReception, BonReceptionPayload};
use crate::repositories::reception_repository::ReceptionRepository;
use crate::services::reception_service::ReceptionService;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    status: String,
    data: Option<T>,
    error: Option<String>,
}

#[tauri::command]
pub async fn get_fournisseurs() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data = ReceptionRepository::get_fournisseurs(&mut client).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn add_fournisseur(nom: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let new_id = ReceptionRepository::create_fournisseur(&mut client, &nom).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let res = ApiResponse { status: "success".to_string(), data: Some(new_id), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn get_materiaux() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data = ReceptionRepository::get_materiaux(&mut client).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn get_historique_receptions() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data = ReceptionRepository::get_historique_receptions(&mut client).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn update_prix_reception(ligne_id: i32, nouveau_prix: f64) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    client.simple_query("BEGIN TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    match ReceptionRepository::update_prix_achat(&mut client, ligne_id, nouveau_prix).await {
        Ok(_) => {
            let mut m_id = None;
            if let Ok(stream) = client.query("SELECT MateriauID FROM LigneBonReception WHERE LigneBRID = @p1", &[&ligne_id]).await {
                if let Ok(rows) = stream.into_first_result().await {
                    if let Some(row) = rows.first() {
                        m_id = Some(row.get::<i32, _>("MateriauID").unwrap());
                    }
                }
            }
            if let Some(id) = m_id {
                let _ = ReceptionRepository::update_prix_catalogue(&mut client, id, nouveau_prix).await;
            }

            client.simple_query("COMMIT TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
            let res = ApiResponse { status: "success".to_string(), data: Some("Prix mis à jour".to_string()), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let _ = client.simple_query("ROLLBACK TRAN").await;
            let res = ApiResponse::<String> { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn submit_reception(payload_str: String) -> Result<String, String> {
    let payload: BonReceptionPayload = serde_json::from_str(&payload_str).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    client.simple_query("BEGIN TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    match ReceptionService::receive_stock(&mut client, payload).await {
        Ok(_) => {
            client.simple_query("COMMIT TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
            let res = ApiResponse { status: "success".to_string(), data: Some("Reception enregistree avec succes".to_string()), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let _ = client.simple_query("ROLLBACK TRAN").await;
            let res = ApiResponse::<String> { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}
