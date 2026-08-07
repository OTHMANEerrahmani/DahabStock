use dahabstock_lib::database::connection::get_connection;
use tokio;

#[tokio::main]
async fn main() {
    let mut client = match get_connection().await {
        Ok(c) => c,
        Err(e) => { println!("DB Error: {:?}", e); return; }
    };

    println!("Starting DB migrations...");

    let queries = vec![
        "ALTER TABLE StockChutes ADD CodeClientOrigine NVARCHAR(255);",
        "ALTER TABLE StockChutes ADD CategorieEmplacement NVARCHAR(255);",
    ];

    for q in queries {
        match client.execute(q, &[]).await {
            Ok(_) => println!("Successfully executed: {}", q),
            Err(e) => println!("Warning (might already exist): {}", e),
        }
    }

    println!("DB migrations finished.");
}
