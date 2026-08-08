use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct SavePdfPayload {
    pub filename: String,
    pub data: Vec<u8>,
    pub is_temp: Option<bool>,
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

    let target_dir = if payload.is_temp.unwrap_or(false) {
        std::env::temp_dir()
    } else {
        base_dir.join("DahabStock").join("Documents").join("Bons de Sortie")
    };

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

    if payload.is_temp.unwrap_or(false) {
        let mut success = false;
        #[cfg(target_os = "windows")]
        {
            if let Ok(_) = std::process::Command::new("powershell")
                .args([
                    "-WindowStyle", "Hidden",
                    "-Command",
                    &format!("Start-Process -FilePath '{}' -Verb Print", file_path.to_string_lossy())
                ])
                .spawn()
            {
                success = true;
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(_) = std::process::Command::new("open")
                .arg(&file_path)
                .spawn()
            {
                success = true;
            }
        }
        
        if !success {
            let res = SavePdfResponse {
                status: "error".to_string(),
                path: file_path.to_string_lossy().to_string(),
                error: Some("Impossible d'ouvrir le document pour impression. Vérifiez qu'un lecteur PDF est installé.".to_string()),
            };
            return Ok(serde_json::to_string(&res).unwrap());
        }
    }

    let res = SavePdfResponse {
        status: "success".to_string(),
        path: file_path.to_string_lossy().to_string(),
        error: None,
    };
    Ok(serde_json::to_string(&res).unwrap())
}
