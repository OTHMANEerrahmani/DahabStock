
use tiberius::{Client, Config, AuthMethod, EncryptionLevel};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use anyhow::Result;

pub async fn get_connection() -> Result<Client<tokio_util::compat::Compat<TcpStream>>> {
    let mut config = Config::new();
    config.host("127.0.0.1");
    config.port(1433);
    config.database("DahabStock");
    config.authentication(AuthMethod::sql_server("sa", "StrongPassword123!"));
    config.trust_cert();
    config.encryption(EncryptionLevel::NotSupported);
    
    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    
    let client = Client::connect(config, tcp.compat_write()).await?;
    Ok(client)
}
