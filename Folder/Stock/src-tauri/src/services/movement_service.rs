
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::mouvement_stock::MouvementStock;
use crate::repositories::mouvement_repository::MouvementRepository;

pub struct MovementService;

impl MovementService {
    pub async fn log_movement(
        client: &mut Client<Compat<TcpStream>>, 
        materiau_id: i32, 
        type_mouvement: String, 
        quantite: f64, 
        reference_operation: Option<String>, 
        consommation_id: Option<i32>, 
        perte_id: Option<i32>, 
        bon_reception_id: Option<i32>
    ) -> Result<()> {
        let m = MouvementStock {
            mouvement_id: None,
            materiau_id,
            type_mouvement,
            quantite,
            reference_operation,
            consommation_id,
            perte_id,
            bon_reception_id,
        };
        MouvementRepository::log_movement(client, m).await
    }
}
