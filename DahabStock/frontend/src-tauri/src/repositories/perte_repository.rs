use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::perte::HistoriquePerte;

pub struct PerteRepository;

impl PerteRepository {
    pub async fn create_perte(
        client: &mut Client<Compat<TcpStream>>, 
        materiau_id: i32, 
        source_stock: &str, 
        raison: &str, 
        quantite_perdue: f64
    ) -> Result<i32> {
        let sql = "INSERT INTO Perte (MateriauID, SourceStock, DateDeclaration, Raison, QuantitePerdue) OUTPUT INSERTED.PerteID VALUES (@p1, @p2, GETDATE(), @p3, @p4)";
        let stream = client.query(sql, &[&materiau_id, &source_stock, &raison, &quantite_perdue]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("PerteID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create perte"))
    }

    pub async fn get_historique_pertes(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<HistoriquePerte>> {
        let sql = "
            SELECT 
                p.PerteID,
                CONVERT(varchar, p.DateDeclaration, 23) as DateDeclaration,
                m.Reference,
                m.Designation,
                p.SourceStock,
                p.Raison,
                CAST(p.QuantitePerdue AS FLOAT) as QuantitePerdue
            FROM Perte p
            JOIN Materiau m ON p.MateriauID = m.MateriauID
            ORDER BY p.DateDeclaration DESC, p.PerteID DESC
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(HistoriquePerte {
                perte_id: row.get("PerteID").unwrap(),
                date_declaration: row.get::<&str, _>("DateDeclaration").unwrap_or("").to_string(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                source_stock: row.get::<&str, _>("SourceStock").unwrap_or("").to_string(),
                raison: row.get::<&str, _>("Raison").unwrap_or("").to_string(),
                quantite_perdue: row.get::<f64, _>("QuantitePerdue").unwrap_or(0.0),
            });
        }
        Ok(list)
    }
}
