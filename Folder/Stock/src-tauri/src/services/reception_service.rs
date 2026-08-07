
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::reception::BonReceptionPayload;
use crate::repositories::reception_repository::ReceptionRepository;
use crate::services::stock_service::StockService;
use crate::services::movement_service::MovementService;

pub struct ReceptionService;

impl ReceptionService {
    pub async fn receive_stock(client: &mut Client<Compat<TcpStream>>, payload: BonReceptionPayload) -> Result<()> {
        let br_id = ReceptionRepository::create_bon_reception(client, payload.fournisseur_id, &payload.numero_br, &payload.date_reception).await?;
        
        for ligne in payload.lignes {
            ReceptionRepository::create_ligne_reception(client, br_id, ligne.materiau_id, ligne.quantite_recue, ligne.prix_achat).await?;
            ReceptionRepository::update_prix_catalogue(client, ligne.materiau_id, ligne.prix_achat).await?;
            StockService::update_stock_principal(client, ligne.materiau_id, ligne.quantite_recue as i32).await?;
            MovementService::log_movement(
                client,
                ligne.materiau_id,
                "Entree_Fournisseur".to_string(),
                ligne.quantite_recue,
                Some(payload.numero_br.clone()),
                None,
                None,
                Some(br_id)
            ).await?;
        }
        Ok(())
    }
}
