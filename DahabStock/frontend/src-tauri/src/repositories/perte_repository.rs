
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

pub struct PerteRepository;

impl PerteRepository {
    pub async fn create_perte(
        client: &mut Client<Compat<TcpStream>>,
        materiau_id: i32,
        source_stock: &str,
        raison: &str,
        quantite_perdue: i32
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
}
