use dahabstock_lib::database::connection::get_connection;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Connecting to database...");
    let mut client = get_connection().await?;
    
    println!("Altering table...");
    client.execute("ALTER TABLE Consommation ADD OperationID NVARCHAR(50) NULL", &[]).await?;
    
    println!("Table altered successfully!");
    Ok(())
}
