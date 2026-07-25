use tiberius::{Client, Config, AuthMethod, EncryptionLevel};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = Config::new();
    config.host("localhost");
    config.port(1433);
    config.authentication(AuthMethod::sql_server("sa", "Dahab2026!!!"));
    config.encryption(EncryptionLevel::NotSupported);
    config.trust_cert();
    config.database("DahabStock");

    let tcp = TcpStream::connect(config.get_addr()).await?;
    let tcp = tcp.compat_write();
    let mut client = Client::connect(config, tcp).await?;

    println!("Connected to DB. Testing get_historique_consommations...");

    let sql = "
            SELECT TOP 100 
                MIN(c.ConsommationID) as ConsommationID,
                CONVERT(varchar, c.DateOperation, 23) as Date,
                m.Reference,
                m.Designation,
                CAST(p.CodeProjet AS NVARCHAR(50)) as Projet,
                CAST(
                    CASE 
                        WHEN ba.MateriauID IS NOT NULL THEN COUNT(c.ConsommationID)
                        ELSE SUM(c.QuantiteUtilisee)
                    END 
                AS FLOAT) as QuantiteUtilisee,
                CAST(SUM(c.LongueurUtilisee) AS FLOAT) as LongueurUtilisee,
                ISNULL(c.Preneur, '') as Preneur,
                CAST(SUM(
                    CASE 
                        WHEN ast.MateriauID IS NOT NULL THEN c.QuantiteUtilisee * ast.PrixUnitaire
                        WHEN ba.MateriauID IS NOT NULL THEN c.LongueurUtilisee * ba.PrixParMetre
                        ELSE 0 
                    END
                ) AS FLOAT) as CoutTotal
            FROM Consommation c
            JOIN Materiau m ON c.MateriauID = m.MateriauID
            JOIN Projet p ON c.ProjetID = p.ProjetID
            LEFT JOIN ArticleStandard ast ON m.MateriauID = ast.MateriauID
            LEFT JOIN BarreAluminium ba ON m.MateriauID = ba.MateriauID
            GROUP BY 
                CONVERT(varchar, c.DateOperation, 23),
                m.Reference,
                m.Designation,
                CAST(p.CodeProjet AS NVARCHAR(50)),
                ISNULL(c.Preneur, ''),
                ba.MateriauID,
                ast.MateriauID
            ORDER BY Date DESC, ConsommationID DESC
    ";
    
    let stream = client.query(sql, &[]).await?;
    let rows = stream.into_first_result().await?;
    
    println!("Query successful, rows: {}", rows.len());
    
    for row in rows {
        let qte: f64 = row.get("QuantiteUtilisee").unwrap_or(0.0);
        println!("Quantite: {}", qte);
    }

    Ok(())
}
