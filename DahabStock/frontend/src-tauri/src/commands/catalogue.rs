
use serde::Serialize;
use crate::database::connection::get_connection;
use crate::models::catalogue::{ArticleStandardPayload, BarreAluminiumPayload, CatalogueItem};
use crate::services::catalogue_service::CatalogueService;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    status: String,
    data: Option<T>,
    error: Option<String>,
}

#[tauri::command]
pub async fn get_catalogue_complet() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    let data = CatalogueService::get_catalogue_complet(&mut client).await.map_err(|e| e.to_string())?;
    let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn add_article_standard(payload_str: String) -> Result<String, String> {
    let payload: ArticleStandardPayload = serde_json::from_str(&payload_str).map_err(|e| e.to_string())?;
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    
    client.simple_query("BEGIN TRAN").await.map_err(|e| e.to_string())?;
    match CatalogueService::add_article_standard(&mut client, payload).await {
        Ok(_) => {
            client.simple_query("COMMIT TRAN").await.map_err(|e| e.to_string())?;
            let res = ApiResponse { status: "success".to_string(), data: Some("Article ajouté avec succès".to_string()), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let _ = client.simple_query("ROLLBACK TRAN").await;
            let res = ApiResponse::<String> { status: "error".to_string(), data: None, error: Some(e.to_string()) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn add_barre_aluminium(payload_str: String) -> Result<String, String> {
    let payload: BarreAluminiumPayload = serde_json::from_str(&payload_str).map_err(|e| e.to_string())?;
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    
    client.simple_query("BEGIN TRAN").await.map_err(|e| e.to_string())?;
    match CatalogueService::add_barre_aluminium(&mut client, payload).await {
        Ok(_) => {
            client.simple_query("COMMIT TRAN").await.map_err(|e| e.to_string())?;
            let res = ApiResponse { status: "success".to_string(), data: Some("Barre ajoutée avec succès".to_string()), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let _ = client.simple_query("ROLLBACK TRAN").await;
            let res = ApiResponse::<String> { status: "error".to_string(), data: None, error: Some(e.to_string()) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}
