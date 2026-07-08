#[cfg(test)]
mod integration_tests {
    use crate::database::connection::get_connection;
    use crate::services::consumption_service::ConsumptionService;
    use crate::services::loss_service::LossService;
    use tiberius::Client;
    use tokio::net::TcpStream;
    use tokio_util::compat::Compat;

    async fn setup_db(client: &mut Client<Compat<TcpStream>>) -> anyhow::Result<i32> {
        // Setup base records
        client.execute("IF NOT EXISTS (SELECT * FROM Projet WHERE ProjetID=1) BEGIN SET IDENTITY_INSERT Projet ON; INSERT INTO Projet (ProjetID, CodeProjet) VALUES (1, 9999); SET IDENTITY_INSERT Projet OFF; END", &[]).await?;
        client.execute("IF NOT EXISTS (SELECT * FROM Materiau WHERE Reference='ALU-BLANC-RUST') INSERT INTO Materiau (Reference, Designation) VALUES ('ALU-BLANC-RUST', 'Barre Alu Rust 6m')", &[]).await?;
        
        let stream = client.query("SELECT MateriauID FROM Materiau WHERE Reference='ALU-BLANC-RUST'", &[]).await?;
        let rows = stream.into_first_result().await?;
        let materiau_id: i32 = rows.first().unwrap().get("MateriauID").unwrap();
        
        client.execute("IF NOT EXISTS (SELECT * FROM BarreAluminium WHERE MateriauID=@p1) INSERT INTO BarreAluminium (MateriauID, Longueur, Couleur, PrixParMetre) VALUES (@p2, 6.0, 'Rust', 10.0)", &[&materiau_id, &materiau_id]).await?;

        // Teardown previous
        client.execute("DELETE FROM MouvementStock WHERE MateriauID=@p1", &[&materiau_id]).await?;
        client.execute("DELETE FROM Consommation WHERE MateriauID=@p1", &[&materiau_id]).await?;
        client.execute("DELETE FROM Perte WHERE MateriauID=@p1", &[&materiau_id]).await?;
        client.execute("DELETE FROM StockChutes WHERE MateriauID=@p1", &[&materiau_id]).await?;
        client.execute("DELETE FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await?;

        Ok(materiau_id)
    }

    #[tokio::test]
    async fn test_1_consommation_avec_chute_existante() {
        let mut client = get_connection().await.unwrap();
        let materiau_id = setup_db(&mut client).await.unwrap();

        client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 10, 'Actif')", &[&materiau_id]).await.unwrap();
        client.execute("INSERT INTO StockChutes (MateriauID, LongueurRestante, DateCreation, Statut) VALUES (@p1, 2.0, GETDATE(), 'Disponible')", &[&materiau_id]).await.unwrap();

        // Must run inside transaction if BLL requires atomicity, but our BLL runs separate queries. Let's wrap it.
        client.simple_query("BEGIN TRAN").await.unwrap();
        let res = ConsumptionService::consume_barre(&mut client, 1, materiau_id, 1.5).await;
        if res.is_ok() {
            client.simple_query("COMMIT TRAN").await.unwrap();
        } else {
            client.simple_query("ROLLBACK TRAN").await.unwrap();
        }

        let rows = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let qty: i32 = rows.first().unwrap().get("QuantiteDisponible").unwrap();
        assert_eq!(qty, 10);

        let rows = client.query("SELECT CAST(LongueurRestante AS FLOAT) as L FROM StockChutes WHERE MateriauID=@p1 AND Statut='Disponible'", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        assert_eq!(rows.len(), 1);
        let l: f64 = rows.first().unwrap().get("L").unwrap();
        assert_eq!(l, 0.5);
    }

    #[tokio::test]
    async fn test_2_consommation_sans_chute() {
        let mut client = get_connection().await.unwrap();
        let materiau_id = setup_db(&mut client).await.unwrap();

        client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 10, 'Actif')", &[&materiau_id]).await.unwrap();

        client.simple_query("BEGIN TRAN").await.unwrap();
        ConsumptionService::consume_barre(&mut client, 1, materiau_id, 4.0).await.unwrap();
        client.simple_query("COMMIT TRAN").await.unwrap();

        let rows = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let qty: i32 = rows.first().unwrap().get("QuantiteDisponible").unwrap();
        assert_eq!(qty, 9);

        let rows = client.query("SELECT CAST(LongueurRestante AS FLOAT) as L FROM StockChutes WHERE MateriauID=@p1 AND Statut='Disponible'", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        assert_eq!(rows.len(), 1);
        let l: f64 = rows.first().unwrap().get("L").unwrap();
        assert_eq!(l, 2.0);
    }

    #[tokio::test]
    async fn test_3_consommation_barre_complete() {
        let mut client = get_connection().await.unwrap();
        let materiau_id = setup_db(&mut client).await.unwrap();

        client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 10, 'Actif')", &[&materiau_id]).await.unwrap();

        client.simple_query("BEGIN TRAN").await.unwrap();
        ConsumptionService::consume_barre(&mut client, 1, materiau_id, 6.0).await.unwrap();
        client.simple_query("COMMIT TRAN").await.unwrap();

        let rows = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let qty: i32 = rows.first().unwrap().get("QuantiteDisponible").unwrap();
        assert_eq!(qty, 9);

        let rows = client.query("SELECT COUNT(*) as Cnt FROM StockChutes WHERE MateriauID=@p1 AND Statut='Disponible'", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let cnt: i32 = rows.first().unwrap().get("Cnt").unwrap();
        assert_eq!(cnt, 0);
    }

    #[tokio::test]
    async fn test_4_declaration_perte() {
        let mut client = get_connection().await.unwrap();
        let materiau_id = setup_db(&mut client).await.unwrap();

        client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 100, 'Actif')", &[&materiau_id]).await.unwrap();

        client.simple_query("BEGIN TRAN").await.unwrap();
        LossService::declare_loss(&mut client, materiau_id, 2, "StockPrincipal", "Casse Rust", None).await.unwrap();
        client.simple_query("COMMIT TRAN").await.unwrap();

        let rows = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let qty: i32 = rows.first().unwrap().get("QuantiteDisponible").unwrap();
        assert_eq!(qty, 98);

        let rows = client.query("SELECT COUNT(*) as Cnt FROM Perte WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let cnt: i32 = rows.first().unwrap().get("Cnt").unwrap();
        assert_eq!(cnt, 1);
    }

    #[tokio::test]
    async fn test_5_transaction_rollback() {
        let mut client = get_connection().await.unwrap();
        let materiau_id = setup_db(&mut client).await.unwrap();

        client.execute("INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 10, 'Actif')", &[&materiau_id]).await.unwrap();

        client.simple_query("BEGIN TRAN").await.unwrap();
        
        // Emulate transaction failure by executing a failing query inside the transaction after updating stock
        let res = async {
            crate::services::stock_service::StockService::update_stock_principal(&mut client, materiau_id, -1).await?;
            // Force error
            client.execute("INSERT INTO InvalidTable (ID) VALUES (1)", &[]).await?;
            Ok::<(), anyhow::Error>(())
        }.await;

        if res.is_ok() {
            client.simple_query("COMMIT TRAN").await.unwrap();
        } else {
            client.simple_query("ROLLBACK TRAN").await.unwrap();
        }

        // Must remain 10
        let rows = client.query("SELECT QuantiteDisponible FROM StockPrincipal WHERE MateriauID=@p1", &[&materiau_id]).await.unwrap().into_first_result().await.unwrap();
        let qty: i32 = rows.first().unwrap().get("QuantiteDisponible").unwrap();
        assert_eq!(qty, 10);
    }
}
