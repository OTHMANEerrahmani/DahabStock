use crate::database::connection::get_connection;
use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: Option<T>,
    pub error: Option<String>,
}
use crate::repositories::stock_repository::StockRepository;

#[tauri::command]
pub async fn get_stock_chutes() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    match StockRepository::get_stock_chutes(&mut client).await {
        Ok(data) => {
            let res = ApiResponse { status: "success".to_string(), data: Some(data), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(e.to_string()) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}
