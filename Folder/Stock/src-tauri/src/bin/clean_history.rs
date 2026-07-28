use dahabstock_lib::database::connection::get_connection;
use tokio;

#[tokio::main]
async fn main() {
    let mut client = match get_connection().await {
        Ok(c) => c,
        Err(e) => { println!("DB Error: {:?}", e); return; }
    };
    println!("Starting history cleanup...");

    // 1. Delete all transactional history
    let tables_to_clean = vec![
        "DELETE FROM MouvementStock",
        "DELETE FROM Consommation",
        "DELETE FROM Perte",
        "DELETE FROM StockChutes",
        "DELETE FROM LigneBonReception",
        "DELETE FROM BonReception",
        "DELETE FROM Projet",
    ];

    for query in tables_to_clean {
        match client.execute(query, &[]).await {
            Ok(_) => println!("Executed: {}", query),
            Err(e) => println!("Warning on {}: {:?}", query, e),
        }
    }

    // 2. Delete the demo catalog items that were blocked by foreign keys earlier
    let demo_refs = vec!["test", "test1", "Test7", "Test8", "123", "7553", "poine", "Poun"];
    for r in demo_refs {
        let _ = client.execute("DELETE FROM StockPrincipal WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM ArticleStandard WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM BarreAluminium WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM Materiau WHERE Reference = @p1", &[&r]).await;
    }

    // 3. Reset all remaining stock to 0 (for the real accessories)
    match client.execute("UPDATE StockPrincipal SET QuantiteDisponible = 0", &[]).await {
        Ok(_) => println!("Stock successfully reset to 0."),
        Err(e) => println!("Error resetting stock: {:?}", e),
    }

    println!("History cleanup completed successfully! Your application is now ready for production.");
}
