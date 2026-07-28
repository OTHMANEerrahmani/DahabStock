use dahabstock_lib::database::connection::get_connection;
use tokio;

#[tokio::main]
async fn main() {
    let mut client = match get_connection().await {
        Ok(c) => c,
        Err(e) => { println!("DB Error: {:?}", e); return; }
    };
    println!("Starting catalogue seed...");

    // 1. Delete demo data safely
    let demo_refs = vec!["test", "test1", "Test7", "Test8", "123", "7553", "poine", "Poun"];
    for r in demo_refs {
        let _ = client.execute("DELETE FROM StockPrincipal WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM ArticleStandard WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM BarreAluminium WHERE MateriauID IN (SELECT MateriauID FROM Materiau WHERE Reference = @p1)", &[&r]).await;
        let _ = client.execute("DELETE FROM Materiau WHERE Reference = @p1", &[&r]).await;
    }
    
    // 2. Insert real data
    let articles = vec![
        ("200.032", "Tasseau de traverse 25 mm"),
        ("200.205", "Bouchons de battue"),
        ("200.281", "Équerre dormant et ouvrant fenêtre"),
        ("200.285", "Équerre à pion ouvrant porte"),
        ("005.031", "Clip rejet d’eau"),
        ("003.314", "Bouchons rejet d’eau"),
        ("003.610", "Verrou de porte en feuillure"),
        ("100.101", "Vis à tôle 3.5 × 25"),
        ("100.003", "Tasseau dormant seuil"),
        ("200.055", "Crémone"),
        ("200.080", "Béquille"),
        ("200.123", "Compas"),
        ("200.202", "Loqueteau"),
        ("200.276", "Kit crémone 1 vantail"),
        ("200.376", "Kit crémone 2 vantaux"),
        ("200.703", "Paumelle réversible"),
        ("003.224", "Gâche basse inox"),
        ("200.031", "Tasseau de traverse 11 mm"),
        ("100.141P", "Serrure"),
        ("305.003", "Busette à clapet anti-retour"),
        ("005.046", "Vis 4.8 × 38"),
        ("023.502", "Joint brosse pour porte"),
        ("A200.106", "Joint d’étanchéité tournant"),
        ("A200.104", "Joint de bourrage 4 mm tournant"),
        ("A200.232", "Joint extérieur 2 mm"),
        ("023.901", "Joint de bourrage 2 mm"),
    ];

    for (code, designation) in articles {
        let check_sql = "SELECT MateriauID FROM Materiau WHERE Reference = @p1";
        let stream = client.query(check_sql, &[&code]).await.unwrap();
        let rows = stream.into_first_result().await.unwrap();
        
        if rows.is_empty() {
            let insert_mat = "INSERT INTO Materiau (Reference, Designation) OUTPUT INSERTED.MateriauID VALUES (@p1, @p2)";
            let stream_mat = client.query(insert_mat, &[&code, &designation]).await.unwrap();
            let row_mat = stream_mat.into_first_result().await.unwrap();
            let mat_id: i32 = row_mat[0].get("MateriauID").unwrap();

            let cat = "Accessoire";
            let prix = 0.0f64;
            let insert_art = "INSERT INTO ArticleStandard (MateriauID, Categorie, PrixUnitaire) VALUES (@p1, @p2, @p3)";
            client.execute(insert_art, &[&mat_id, &cat, &prix]).await.unwrap();

            let insert_stock = "INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 0, 'Actif')";
            client.execute(insert_stock, &[&mat_id]).await.unwrap();
            
            println!("Inserted: {} - {}", code, designation);
        } else {
            println!("Skipped (already exists): {}", code);
        }
    }
    println!("Seed completed successfully!");
}
