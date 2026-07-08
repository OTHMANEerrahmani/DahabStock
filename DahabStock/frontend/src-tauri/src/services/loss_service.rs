
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::services::stock_service::StockService;
use crate::services::movement_service::MovementService;
use crate::repositories::perte_repository::PerteRepository;

pub struct LossService;

impl LossService {
    pub async fn declare_loss(
        client: &mut Client<Compat<TcpStream>>,
        materiau_id: i32,
        quantite_perdue: i32,
        source_stock: &str,
        raison: &str,
        chute_id: Option<i32>
    ) -> Result<()> {
        if source_stock == "StockPrincipal" {
            StockService::update_stock_principal(client, materiau_id, -quantite_perdue).await?;
        } else if source_stock == "StockChutes" {
            if let Some(cid) = chute_id {
                StockService::consume_chute(client, cid).await?;
            } else {
                return Err(anyhow::anyhow!("chute_id must be provided when source is StockChutes"));
            }
        } else {
            return Err(anyhow::anyhow!("Invalid source_stock"));
        }

        let perte_id = PerteRepository::create_perte(client, materiau_id, source_stock, raison, quantite_perdue).await?;
        MovementService::log_movement(client, materiau_id, "Perte".to_string(), -(quantite_perdue as f64), Some(raison.to_string()), None, Some(perte_id), None).await?;
        
        Ok(())
    }
}
