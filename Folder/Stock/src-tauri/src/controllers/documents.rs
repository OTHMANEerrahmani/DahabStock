use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct SavePdfPayload {
    pub filename: String,
    pub data: Vec<u8>,
}

#[derive(Serialize)]
pub struct SavePdfResponse {
    pub status: String,
    pub path: String,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn save_pdf_document(payload: SavePdfPayload) -> Result<String, String> {
    // Define base directory based on OS
    let base_dir = if cfg!(target_os = "windows") {
        PathBuf::from("C:\\")
    } else {
        // Fallback for macOS/Linux (usually for development)
        std::env::var("HOME").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("/"))
    };

    let target_dir = base_dir.join("DahabStock").join("Documents").join("Bons de Sortie");

    // Create directories if they don't exist
    if !target_dir.exists() {
        if let Err(e) = fs::create_dir_all(&target_dir) {
            let res = SavePdfResponse {
                status: "error".to_string(),
                path: "".to_string(),
                error: Some(format!("Erreur lors de la création du dossier: {}", e)),
            };
            return Ok(serde_json::to_string(&res).unwrap());
        }
    }

    let file_path = target_dir.join(&payload.filename);

    // Write file
    if let Err(e) = fs::write(&file_path, &payload.data) {
        let res = SavePdfResponse {
            status: "error".to_string(),
            path: "".to_string(),
            error: Some(format!("Erreur d'écriture du fichier: {}", e)),
        };
        return Ok(serde_json::to_string(&res).unwrap());
    }

    let res = SavePdfResponse {
        status: "success".to_string(),
        path: file_path.to_string_lossy().to_string(),
        error: None,
    };
    Ok(serde_json::to_string(&res).unwrap())
}
