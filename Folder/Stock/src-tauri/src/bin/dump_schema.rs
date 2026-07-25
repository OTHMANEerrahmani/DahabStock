use tiberius::{Client, Config, AuthMethod, EncryptionLevel};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = Config::new();
    config.host("127.0.0.1");
    config.port(1433);
    config.database("DahabStock");
    config.authentication(AuthMethod::sql_server("sa", "StrongPassword123!"));
    config.trust_cert();
    config.encryption(EncryptionLevel::NotSupported);
    
    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    
    let mut client = Client::connect(config, tcp.compat_write()).await?;
    
    let stream = client.query(
        "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_NAME, ORDINAL_POSITION",
        &[]
    ).await?;
    
    let rows = stream.into_first_result().await?;
    
    for row in rows {
        let table: &str = row.get("TABLE_NAME").unwrap_or("");
        let column: &str = row.get("COLUMN_NAME").unwrap_or("");
        let dtype: &str = row.get("DATA_TYPE").unwrap_or("");
        let nullable: &str = row.get("IS_NULLABLE").unwrap_or("");
        let char_len: i32 = row.get("CHARACTER_MAXIMUM_LENGTH").unwrap_or(0);
        let default_val: &str = row.get("COLUMN_DEFAULT").unwrap_or("");
        
        let mut type_info = String::from(dtype);
        if type_info.contains("char") {
            if char_len == -1 {
                type_info.push_str("(MAX)");
            } else if char_len > 0 {
                type_info.push_str(&format!("({})", char_len));
            }
        }
        
        println!("{}.{} - {} (Nullable: {}, Default: {})", table, column, type_info, nullable, default_val);
    }

    Ok(())
}
