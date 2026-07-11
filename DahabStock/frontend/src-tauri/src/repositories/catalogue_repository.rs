
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::catalogue::{ArticleStandardPayload, BarreAluminiumPayload, CatalogueItem};

pub struct CatalogueRepository;

impl CatalogueRepository {
    pub async fn create_materiau(client: &mut Client<Compat<TcpStream>>, reference: &str, designation: &str) -> Result<i32> {
        let sql = "INSERT INTO Materiau (Reference, Designation) OUTPUT INSERTED.MateriauID VALUES (@p1, @p2)";
        let stream = client.query(sql, &[&reference, &designation]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("MateriauID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create Materiau"))
    }

    pub async fn add_article_standard(client: &mut Client<Compat<TcpStream>>, payload: ArticleStandardPayload) -> Result<()> {
        let materiau_id = Self::create_materiau(client, &payload.reference, &payload.designation).await?;
        let sql = "INSERT INTO ArticleStandard (MateriauID, Categorie, PrixUnitaire) VALUES (@p1, @p2, @p3)";
        client.execute(sql, &[&materiau_id, &payload.categorie, &payload.prix_unitaire]).await?;
        // Initialize StockPrincipal at 0 to show it in UI immediately
        let sql_stock = "INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 0, 'Actif')";
        client.execute(sql_stock, &[&materiau_id]).await?;
        Ok(())
    }

    pub async fn add_barre_aluminium(client: &mut Client<Compat<TcpStream>>, payload: BarreAluminiumPayload) -> Result<()> {
        let materiau_id = Self::create_materiau(client, &payload.reference, &payload.designation).await?;
        let sql = "INSERT INTO BarreAluminium (MateriauID, Couleur, Longueur, PrixParMetre) VALUES (@p1, @p2, @p3, @p4)";
        client.execute(sql, &[&materiau_id, &payload.couleur, &payload.longueur, &payload.prix_par_metre]).await?;
        // Initialize StockPrincipal at 0
        let sql_stock = "INSERT INTO StockPrincipal (MateriauID, QuantiteDisponible, Statut) VALUES (@p1, 0, 'Actif')";
        client.execute(sql_stock, &[&materiau_id]).await?;
        Ok(())
    }

    pub async fn get_catalogue_complet(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<CatalogueItem>> {
        let sql = "
            SELECT 
                m.MateriauID, m.Reference, m.Designation,
                CASE 
                    WHEN a.MateriauID IS NOT NULL THEN 'Standard'
                    WHEN b.MateriauID IS NOT NULL THEN 'Aluminium'
                    ELSE 'Inconnu'
                END as TypeItem,
                COALESCE(a.Categorie, b.Couleur, '') as CatOuCouleur,
                ISNULL(sp.QuantiteDisponible, 0) as StockActuel
            FROM Materiau m
            LEFT JOIN ArticleStandard a ON m.MateriauID = a.MateriauID
            LEFT JOIN BarreAluminium b ON m.MateriauID = b.MateriauID
            LEFT JOIN StockPrincipal sp ON m.MateriauID = sp.MateriauID
            ORDER BY m.Reference ASC
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(CatalogueItem {
                materiau_id: row.get("MateriauID").unwrap(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                type_item: row.get::<&str, _>("TypeItem").unwrap_or("").to_string(),
                categorie_ou_couleur: row.get::<&str, _>("CatOuCouleur").unwrap_or("").to_string(),
                stock_actuel: row.get("StockActuel").unwrap_or(0),
            });
        }
        Ok(list)
    }
}
