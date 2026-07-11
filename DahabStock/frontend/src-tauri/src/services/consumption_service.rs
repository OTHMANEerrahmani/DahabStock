
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::services::stock_service::StockService;
use crate::services::movement_service::MovementService;
use crate::repositories::consommation_repository::ConsommationRepository;
use crate::repositories::material_repository::MaterialRepository;

pub struct ConsumptionService;

impl ConsumptionService {
    pub async fn consume_barre(client: &mut Client<Compat<TcpStream>>, projet_id: i32, materiau_id: i32, quantite_length: f64, preneur: &str) -> Result<()> {
        let chute = StockService::find_compatible_chute(client, materiau_id, quantite_length).await?;
        
        if let Some(c) = chute {
            StockService::consume_chute(client, c.chute_id).await?;
            let remainder = c.longueur - quantite_length;
            
            let cons_id = ConsommationRepository::create_consommation(
                client, projet_id, materiau_id, 0.0, quantite_length, Some(c.chute_id), preneur, "Chute"
            ).await?;
            
            MovementService::log_movement(client, materiau_id, "Consommation".to_string(), -quantite_length, Some(projet_id.to_string()), Some(cons_id), None, None).await?;
            
            if remainder > 0.0 {
                StockService::add_chute(client, materiau_id, remainder).await?;
                MovementService::log_movement(client, materiau_id, "Creation_Chute".to_string(), remainder, Some(projet_id.to_string()), None, None, None).await?;
            }
        } else {
            StockService::update_stock_principal(client, materiau_id, -1).await?;
            
            let cons_id = ConsommationRepository::create_consommation(
                client, projet_id, materiau_id, 1.0, quantite_length, None, preneur, "Nouvelle Barre"
            ).await?;
            
            MovementService::log_movement(client, materiau_id, "Consommation".to_string(), -1.0, Some(projet_id.to_string()), Some(cons_id), None, None).await?;
            
            let original_length = MaterialRepository::get_barre_longueur(client, materiau_id).await?;
            let remainder = original_length - quantite_length;
            
            if remainder > 0.0 {
                StockService::add_chute(client, materiau_id, remainder).await?;
                MovementService::log_movement(client, materiau_id, "Creation_Chute".to_string(), remainder, Some(projet_id.to_string()), None, None, None).await?;
            }
        }
        Ok(())
    }

    pub async fn consume_standard(client: &mut Client<Compat<TcpStream>>, projet_id: i32, materiau_id: i32, quantite: f64, preneur: &str) -> Result<()> {
        StockService::update_stock_principal(client, materiau_id, -quantite as i32).await?;
        
        let cons_id = ConsommationRepository::create_consommation(
            client, projet_id, materiau_id, quantite, 0.0, None, preneur, "Standard"
        ).await?;
        
        MovementService::log_movement(client, materiau_id, "Consommation".to_string(), -quantite, Some(projet_id.to_string()), Some(cons_id), None, None).await?;
        Ok(())
    }
}
