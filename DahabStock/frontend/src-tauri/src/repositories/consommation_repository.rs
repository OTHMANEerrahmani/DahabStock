
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

pub struct ConsommationRepository;

impl ConsommationRepository {
    pub async fn create_consommation(
        client: &mut Client<Compat<TcpStream>>,
        projet_id: i32,
        materiau_id: i32,
        source: &str,
        quantite: Option<f64>,
        longueur: Option<f64>,
        chute_id: Option<i32>
    ) -> Result<i32> {
        let sql = "INSERT INTO Consommation (ProjetID, MateriauID, SourceConsommation, DateOperation, QuantiteUtilisee, LongueurUtilisee, ChuteID) OUTPUT INSERTED.ConsommationID VALUES (@p1, @p2, @p3, GETDATE(), @p4, @p5, @p6)";
        let stream = client.query(sql, &[&projet_id, &materiau_id, &source, &quantite, &longueur, &chute_id]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("ConsommationID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create consommation"))
    }
}
