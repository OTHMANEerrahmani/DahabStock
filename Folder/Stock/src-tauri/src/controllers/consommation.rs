use crate::database::connection::get_connection;
use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: Option<T>,
    pub error: Option<String>,
}
use crate::models::consommation::{ConsommationBarrePayload, ConsommationStandardPayload, ConsommationChutePayload, ConsommationMultiPayload, SubmitConsommationResponse};
use crate::repositories::projet_repository::ProjetRepository;
use crate::repositories::consommation_repository::ConsommationRepository;
use crate::services::consumption_service::ConsumptionService;
use uuid::Uuid;

#[tauri::command]
pub async fn get_projets() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    match ProjetRepository::get_projets(&mut client).await {
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
pub async fn get_historique_consommations() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    match ConsommationRepository::get_historique_consommations(&mut client).await {
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
pub async fn submit_consommation_barre(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: ConsommationBarrePayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let projet_id = ProjetRepository::get_or_create_projet(&mut client, &data.code_projet).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let operation_id = Uuid::new_v4().to_string();
    
    client.simple_query("BEGIN TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    for _ in 0..data.quantite {
        if let Err(e) = ConsumptionService::consume_barre(&mut client, projet_id, data.materiau_id, 1, &data.preneur, Some(&operation_id), &data.date_consommation).await {
            let _ = client.simple_query("ROLLBACK TRAN").await;
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            return Ok(serde_json::to_string(&res).unwrap());
        }
    }
    
    client.simple_query("COMMIT TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let res = ApiResponse { status: "success".to_string(), data: Some("Consommation enregistrée"), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn submit_consommation_standard(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: ConsommationStandardPayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let projet_id = ProjetRepository::get_or_create_projet(&mut client, &data.code_projet).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let operation_id = Uuid::new_v4().to_string();
    
    match ConsumptionService::consume_standard(&mut client, projet_id, data.materiau_id, data.quantite as f64, &data.preneur, Some(&operation_id), &data.date_consommation).await {
        Ok(_) => {
            let res = ApiResponse { status: "success".to_string(), data: Some("Consommation enregistrée"), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn submit_consommation_multi(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: ConsommationMultiPayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let projet_id = ProjetRepository::get_or_create_projet(&mut client, &data.code_projet).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let operation_id = Uuid::new_v4().to_string();
    
    client.simple_query("BEGIN TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    for ligne in data.lignes {
        if ligne.type_materiau == "Barre Aluminium" {
            for _ in 0..ligne.quantite {
                if let Err(e) = ConsumptionService::consume_barre(&mut client, projet_id, ligne.materiau_id, 1, &data.preneur, Some(&operation_id), &data.date_consommation).await {
                    let _ = client.simple_query("ROLLBACK TRAN").await;
                    let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
                    return Ok(serde_json::to_string(&res).unwrap());
                }
            }
        } else {
            if let Err(e) = ConsumptionService::consume_standard(&mut client, projet_id, ligne.materiau_id, ligne.quantite as f64, &data.preneur, Some(&operation_id), &data.date_consommation).await {
                let _ = client.simple_query("ROLLBACK TRAN").await;
                let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
                return Ok(serde_json::to_string(&res).unwrap());
            }
        }
    }
    
    client.simple_query("COMMIT TRAN").await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let response_data = SubmitConsommationResponse {
        message: "Opération enregistrée avec succès".to_string(),
        operation_id: operation_id,
    };
    let res = ApiResponse { status: "success".to_string(), data: Some(response_data), error: None };
    Ok(serde_json::to_string(&res).unwrap())
}

#[tauri::command]
pub async fn submit_consommation_chute(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let data: ConsommationChutePayload = serde_json::from_str(&payload).map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    
    let projet_id = ProjetRepository::get_or_create_projet(&mut client, &data.code_projet).await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    let operation_id = Uuid::new_v4().to_string();
    
    match ConsumptionService::consume_chute(&mut client, projet_id, data.chute_id, &data.preneur, Some(&operation_id), &data.date_consommation).await {
        Ok(_) => {
            let response_data = SubmitConsommationResponse {
                message: "Chute consommée avec succès".to_string(),
                operation_id: operation_id,
            };
            let res = ApiResponse { status: "success".to_string(), data: Some(response_data), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(crate::utils::format_sql_error(&e.to_string())) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn get_consommations_by_projet(projet_id: i32) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| crate::utils::format_sql_error(&e.to_string()))?;
    match ConsommationRepository::get_consommations_by_projet(&mut client, projet_id).await {
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
