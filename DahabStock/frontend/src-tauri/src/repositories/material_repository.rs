
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

pub struct MaterialRepository;

impl MaterialRepository {
    pub async fn get_barre_longueur(client: &mut Client<Compat<TcpStream>>, materiau_id: i32) -> Result<f64> {
        let sql = "SELECT CAST(Longueur AS FLOAT) as L FROM BarreAluminium WHERE MateriauID = @p1";
        let stream = client.query(sql, &[&materiau_id]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let longueur: f64 = row.get("L").unwrap();
            return Ok(longueur);
        }
        Err(anyhow::anyhow!("BarreAluminium not found for MateriauID {}", materiau_id))
    }
}
