
use tiberius::{Client, Config, AuthMethod, EncryptionLevel};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use anyhow::Result;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
struct AppConfig {
    db_host: String,
    db_port: u16,
    db_name: String,
    db_user: String,
    db_password: String,
}

pub async fn get_connection() -> Result<Client<tokio_util::compat::Compat<TcpStream>>> {
    // Essayer de lire config.json depuis le dossier de l'exécutable
    let mut config_path = std::env::current_exe()
        .unwrap_or_else(|_| PathBuf::from("."))
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("config.json");

    // Repli : si on est en développement (cargo run), chercher à la racine du projet
    if !config_path.exists() {
        config_path = PathBuf::from("config.json");
    }

    let config_content = fs::read_to_string(&config_path)
        .map_err(|e| anyhow::anyhow!("Impossible de lire le fichier de configuration {:?} : {}", config_path, e))?;
    
    let app_config: AppConfig = serde_json::from_str(&config_content)
        .map_err(|e| anyhow::anyhow!("Format JSON invalide dans config.json : {}", e))?;

    let mut config = Config::new();
    config.host(&app_config.db_host);
    config.port(app_config.db_port);
    config.database(&app_config.db_name);
    config.authentication(AuthMethod::sql_server(&app_config.db_user, &app_config.db_password));
    config.trust_cert();
    config.encryption(EncryptionLevel::NotSupported);
    
    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    
    let client = Client::connect(config, tcp.compat_write()).await?;
    Ok(client)
}
