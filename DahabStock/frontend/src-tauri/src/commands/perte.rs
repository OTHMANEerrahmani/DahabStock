use crate::database::connection::get_connection;
use serde::Serialize;
use crate::models::perte::{PertePayload, HistoriquePerte};
use crate::services::perte_service::PerteService;
use crate::repositories::perte_repository::PerteRepository;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub status: String,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn submit_perte(payload: String) -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    let data: PertePayload = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
    
    let res = match data.type_perte.as_str() {
        "Standard" => {
            if let Some(mat_id) = data.materiau_id {
                PerteService::declare_perte_standard(&mut client, mat_id, data.quantite_ou_longueur, &data.raison).await
            } else {
                Err(anyhow::anyhow!("MateriauID manquant pour une perte standard"))
            }
        },
        "Barre" => {
            if let Some(mat_id) = data.materiau_id {
                PerteService::declare_perte_barre(&mut client, mat_id, data.quantite_ou_longueur, &data.raison).await
            } else {
                Err(anyhow::anyhow!("MateriauID manquant pour une perte de barre"))
            }
        },
        "Chute" => {
            if let Some(chute_id) = data.chute_id {
                PerteService::declare_perte_chute(&mut client, chute_id, data.quantite_ou_longueur, &data.raison).await
            } else {
                Err(anyhow::anyhow!("ChuteID manquant pour une perte de chute"))
            }
        },
        _ => Err(anyhow::anyhow!("Type de perte inconnu")),
    };

    match res {
        Ok(_) => {
            let res = ApiResponse { status: "success".to_string(), data: Some("Perte enregistrée avec succès"), error: None };
            Ok(serde_json::to_string(&res).unwrap())
        },
        Err(e) => {
            let res: ApiResponse<()> = ApiResponse { status: "error".to_string(), data: None, error: Some(e.to_string()) };
            Ok(serde_json::to_string(&res).unwrap())
        }
    }
}

#[tauri::command]
pub async fn get_historique_pertes() -> Result<String, String> {
    let mut client = get_connection().await.map_err(|e| e.to_string())?;
    match PerteRepository::get_historique_pertes(&mut client).await {
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
