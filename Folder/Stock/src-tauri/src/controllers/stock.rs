use crate::database::connection::get_connection;
use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: Option<T>,
    pub error: Option<String>,
}
use crate::repositories::stock_repository::StockRepository;
use crate::models::stock::AddChutePayload;

#[tauri::command]
pub async fn get_stock_chutes() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    match StockRepository::get_stock_chutes(&mut client).await {
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
pub async fn add_chute_manually(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: AddChutePayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let quantite = data.quantite.unwrap_or(1);

    for _ in 0..quantite {
        match crate::repositories::stock_repository::StockRepository::add_chute_manually(
            &mut client, 
            data.materiau_id, 
            data.longueur_restante, 
            data.code_projet.as_deref(), 
            data.categorie_emplacement.as_deref()
        ).await {
            Ok(_) => {},
            Err(e) => {
                let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
                return Ok(serde_json::to_string(&res).unwrap());
            }
        }
    }

    let res = ApiResponse { status: "success".to_string(), data: Some("Chute(s) ajoutée(s) avec succès"), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}
