
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::stock::CompatibleChute;

pub struct StockRepository;

impl StockRepository {
    pub async fn update_stock_principal(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, quantity_change: i32) -> Result<()> {
        let stream = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID = @p1", &[&materiau_id]).await?;
        let rows = stream.into_first_result().await?;
        
        if let Some(row) = rows.first() {
            let current_qty: i32 = row.get("QuantiteDisponible").unwrap_or(0);
            let new_qty = current_qty + quantity_change;
            if new_qty < 0 {
                return Err(anyhow::anyhow!("Insufficient stock in StockPrincipal for MateriauID {}", materiau_id));
            }
            client.execute("UPDATE StockPrincipal SET QuantiteDisponible = @p1 WHERE MateriauID = @p2", &[&new_qty, &materiau_id]).await?;
        } else {
            if quantity_change > 0 {
                client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, @p2, 'Actif')", &[&materiau_id, &quantity_change]).await?;
            } else {
                return Err(anyhow::anyhow!("Insufficient stock in StockPrincipal for MateriauID {}", materiau_id));
            }
        }
        Ok(())
    }

    pub async fn find_compatible_chute(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, required_length: f64) -> Result<Option<CompatibleChute>> {
        let sql = "SELECT TOP 1 ChuteID, CAST(LongueurRestante AS FLOAT) as L FROM StockChutes WHERE MateriauID = @p1 AND LongueurRestante >= @p2 AND (Statut IS NULL OR Statut != 'Consommee') ORDER BY LongueurRestante ASC";
        let stream = client.query(sql, &[&materiau_id, &required_length]).await?;
        let rows = stream.into_first_result().await?;
        
        if let Some(row) = rows.first() {
            let chute_id: i32 = row.get("ChuteID").unwrap();
            let longueur: f64 = row.get("L").unwrap_or(0.0);
            return Ok(Some(CompatibleChute { chute_id, longueur }));
        }
        Ok(None)
    }

    pub async fn consume_chute(client: &mut Client<Compat<TcpStream>>, chute_id: i32) -> Result<()> {
        client.execute("UPDATE StockChutes SET Statut = 'Consommee', LongueurRestante = 0 WHERE ChuteID = @p1", &[&chute_id]).await?;
        Ok(())
    }

    pub async fn add_chute(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, length: f64) -> Result<i32> {
        let sql = "INSERT INTO StockChutes (MateriauID, LongueurRestante, DateCreation, Statut) OUTPUT INSERTED.ChuteID VALUES (@p1, @p2, GETDATE(), 'Disponible')";
        let stream = client.query(sql, &[&materiau_id, &length]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("ChuteID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to add chute"))
    }
}
