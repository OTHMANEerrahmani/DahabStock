
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
    pub async fn consume_barre(
        client: &mut Client<Compat<TcpStream>>, 
        projet_id: i32, 
        materiau_id: i32, 
        quantite_bars: i32, 
        preneur: &str, 
        operation_id: Option<&str>,
        date_operation: &str
    ) -> Result<()> {
        
        StockService::update_stock_principal(client, materiau_id, -quantite_bars).await?;
        
        let longueur_utilisee = (quantite_bars as f64) * 6.0;

        let cons_id = ConsommationRepository::create_consommation(
            client, projet_id, materiau_id, quantite_bars as f64, longueur_utilisee, None, preneur, "Stock principal", operation_id, date_operation
        ).await?;
        
        MovementService::log_movement(client, materiau_id, "Consommation".to_string(), -(quantite_bars as f64), Some(projet_id.to_string()), Some(cons_id), None, None).await?;
        
        Ok(())
    }

    pub async fn consume_chute(
        client: &mut Client<Compat<TcpStream>>, 
        projet_id: i32, 
        chute_id: i32, 
        preneur: &str, 
        operation_id: Option<&str>,
        date_operation: &str
    ) -> Result<()> {
        // Obtenir les infos de la chute pour tracer la consommation
        let chute_sql = "SELECT MateriauID, CAST(LongueurRestante AS FLOAT) as LongueurRestante FROM StockChutes WHERE ChuteID = @p1 AND Statut = 'Disponible'";
        let stream = client.query(chute_sql, &[&chute_id]).await?;
        let rows = stream.into_first_result().await?;
        
        if let Some(row) = rows.first() {
            let materiau_id: i32 = row.get("MateriauID").unwrap();
            let longueur: f64 = row.get::<f64, _>("LongueurRestante").unwrap_or(0.0);
            
            StockService::consume_chute(client, chute_id).await?;
            
            let cons_id = ConsommationRepository::create_consommation(
                client, projet_id, materiau_id, 0.0, longueur, Some(chute_id), preneur, "Stock des chutes", operation_id, date_operation
            ).await?;
            
            MovementService::log_movement(client, materiau_id, "Consommation Chute".to_string(), -longueur, Some(projet_id.to_string()), Some(cons_id), None, None).await?;
            
            Ok(())
        } else {
            Err(anyhow::anyhow!("Chute non trouvée ou déjà consommée"))
        }
    }

    pub async fn consume_standard(client: &mut Client<Compat<TcpStream>>, projet_id: i32, materiau_id: i32, quantite: f64, preneur: &str, operation_id: Option<&str>, date_operation: &str) -> Result<()> {
        StockService::update_stock_principal(client, materiau_id, -quantite as i32).await?;
        
        let cons_id = ConsommationRepository::create_consommation(
            client, projet_id, materiau_id, quantite, 0.0, None, preneur, "Stock principal", operation_id, date_operation
        ).await?;
        
        MovementService::log_movement(client, materiau_id, "Consommation".to_string(), -quantite, Some(projet_id.to_string()), Some(cons_id), None, None).await?;
        Ok(())
    }
}
