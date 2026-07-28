use dahabstock_lib::database::connection::get_connection;
use tokio;

#[tokio::main]
async fn main() {
    let mut client = match get_connection().await {
        Ok(c) => c,
        Err(e) => { println!("DB Error: {:?}", e); return; }
    };
    println!("Starting profiles seed...");

    let profiles = vec![
        ("KF 01", "Dormant sans cvj"),
        ("KF 02", "Dormant avec cvj"),
        ("KF 25", "Dormant moustiquaire sans cvj"),
        ("KF 03", "Dormant moustiquaire avec cvj"),
        ("KF 04", "Ouvrant fenêtre droit"),
        ("KF 05", "Ouvrant porte arrondi"),
        ("KF 06", "Ouvrant porte droit"),
        ("KF 19", "Ouvrant porte intérieure"),
        ("KF 11", "Traverse de 66 mm"),
        ("KF 12", "Traverse de 81 mm"),
        ("KF 18", "Traverse renforcée"),
        ("KF 22", "Ouvrant porte extérieure"),
        ("KF 08", "Porte-brosse"),
        ("KF 09", "Battue"),
        ("KF 10", "Plinthe de 120 mm"),
        ("KF 15", "Seuil plat"),
        ("013.314", "Rejet d’eau clippable"),
        ("KF 16", "Parclose 24 mm"),
        ("KF 17", "Parclose 20 mm"),
        ("KF 20", "Parclose 16 mm"),
        ("KF 21", "Parclose 12 mm"),
        ("013.507", "Tige de crémone"),
        ("KCL 328", "Bavette"),
        ("KT 13", "Couvre-joint"),
    ];

    let colors = vec!["BL", "NR", "QZ", "BG", "FB"];

    let longueur = 6.03f64;
    let prix_par_metre = 0.0f64;

    for (code, designation) in profiles {
        for &color in &colors {
            let check_sql = "
                SELECT m.MateriauID 
                FROM Materiau m 
                INNER JOIN BarreAluminium b ON m.MateriauID = b.MateriauID 
                WHERE m.Reference = @p1 AND b.Couleur = @p2
            ";
            
            let stream = client.query(check_sql, &[&code, &color]).await.unwrap();
            let rows = stream.into_first_result().await.unwrap();
            
            if rows.is_empty() {
                // Insert Materiau
                let insert_mat = "INSERT INTO Materiau (Reference, Designation) OUTPUT INSERTED.MateriauID VALUES (@p1, @p2)";
                let stream_mat = client.query(insert_mat, &[&code, &designation]).await.unwrap();
                let row_mat = stream_mat.into_first_result().await.unwrap();
                let mat_id: i32 = row_mat[0].get("MateriauID").unwrap();

                // Insert BarreAluminium
                let insert_barre = "INSERT INTO BarreAluminium (MateriauID, Couleur, Longueur, PrixParMetre) VALUES (@p1, @p2, @p3, @p4)";
                client.execute(insert_barre, &[&mat_id, &color, &longueur, &prix_par_metre]).await.unwrap();

                // Insert StockPrincipal
                let insert_stock = "INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 0, 'Actif')";
                client.execute(insert_stock, &[&mat_id]).await.unwrap();
                
                println!("Inserted: {} - {} - {}", code, designation, color);
            } else {
                println!("Skipped (already exists): {} - {} - {}", code, designation, color);
            }
        }
    }

    println!("Profiles seed completed successfully!");
}
