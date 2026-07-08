
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::mouvement_stock::MouvementStock;

pub struct MouvementRepository;

impl MouvementRepository {
    pub async fn log_movement(client: &mut Client<Compat<TcpStream>>, m: MouvementStock) -> Result<()> {
        let sql = "INSERT INTO MouvementStock (MateriauID, TypeMouvement, DateMouvement, Quantite, ReferenceOperation, ConsommationID, PerteID, BonReceptionID) VALUES (@p1, @p2, GETDATE(), @p3, @p4, @p5, @p6, @p7)";
        client.execute(sql, &[&m.materiau_id, &m.type_mouvement.as_str(), &m.quantite, &m.reference_operation.as_deref(), &m.consommation_id, &m.perte_id, &m.bon_reception_id]).await?;
        Ok(())
    }
}
