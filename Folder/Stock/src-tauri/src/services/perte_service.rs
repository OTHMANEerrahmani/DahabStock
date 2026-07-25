use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::services::stock_service::StockService;
use crate::services::movement_service::MovementService;
use crate::repositories::perte_repository::PerteRepository;

pub struct PerteService;

impl PerteService {
    pub async fn declare_perte_standard(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, quantite: f64, raison: &str) -> Result<()> {
        StockService::update_stock_principal(client, materiau_id, -quantite as i32).await?;
        let perte_id = PerteRepository::create_perte(client, materiau_id, "StockPrincipal", raison, quantite).await?;
        MovementService::log_movement(client, materiau_id, "Perte".to_string(), -quantite, None, None, Some(perte_id), None).await?;
        Ok(())
    }

    pub async fn declare_perte_barre(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, quantite: f64, raison: &str) -> Result<()> {
        // Quantite is the number of bars lost (usually 1)
        StockService::update_stock_principal(client, materiau_id, -quantite as i32).await?;
        let perte_id = PerteRepository::create_perte(client, materiau_id, "StockPrincipal", raison, quantite).await?;
        MovementService::log_movement(client, materiau_id, "Perte".to_string(), -quantite, None, None, Some(perte_id), None).await?;
        Ok(())
    }

    pub async fn declare_perte_chute(client: &mut Client<Compat<TcpStream>>, chute_id: i32, longueur: f64, raison: &str) -> Result<()> {
        // Fetch the MateriauID from the chute to log the movement
        let sql = "SELECT MateriauID FROM StockChutes WHERE ChuteID = @p1";
        let stream = client.query(sql, &[&chute_id]).await?;
        let rows = stream.into_first_result().await?;
        
        if let Some(row) = rows.first() {
            let materiau_id: i32 = row.get("MateriauID").unwrap();
            
            // Consume the chute (sets it to 'Consommee', but wait, the reason is Perte. So maybe set Statut to 'Perdue')
            client.execute("UPDATE StockChutes SET Statut = 'Perdue', LongueurRestante = 0 WHERE ChuteID = @p1", &[&chute_id]).await?;
            
            let perte_id = PerteRepository::create_perte(client, materiau_id, "StockChutes", raison, longueur).await?;
            MovementService::log_movement(client, materiau_id, "Perte".to_string(), -longueur, None, None, Some(perte_id), None).await?;
            return Ok(());
        }
        
        Err(anyhow::anyhow!("Chute not found"))
    }
}
