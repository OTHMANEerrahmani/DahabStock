
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::reception::{Fournisseur, MateriauReception, HistoriqueReception};

pub struct ReceptionRepository;

impl ReceptionRepository {
    pub async fn get_fournisseurs(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<Fournisseur>> {
        let stream = client.query("SELECT FournisseurID, Nom FROM Fournisseur", &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(Fournisseur {
                fournisseur_id: row.get("FournisseurID").unwrap(),
                nom: row.get::<&str, _>("Nom").unwrap_or("").to_string(),
            });
        }
        Ok(list)
    }

    pub async fn create_fournisseur(client: &mut Client<Compat<TcpStream>>, nom: &str) -> Result<i32> {
        let sql = "INSERT INTO Fournisseur (Nom) OUTPUT INSERTED.FournisseurID VALUES (@p1)";
        let stream = client.query(sql, &[&nom]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("FournisseurID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create Fournisseur"))
    }

    pub async fn get_materiaux(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<MateriauReception>> {
        let sql = "
            SELECT 
                m.MateriauID, 
                m.Reference, 
                m.Designation, 
                CASE 
                    WHEN a.MateriauID IS NOT NULL THEN 'Article Standard'
                    WHEN b.MateriauID IS NOT NULL THEN 'Barre Aluminium'
                    ELSE 'Inconnu'
                END as TypeArticle 
            FROM Materiau m
            LEFT JOIN ArticleStandard a ON m.MateriauID = a.MateriauID
            LEFT JOIN BarreAluminium b ON m.MateriauID = b.MateriauID
            ORDER BY m.Reference ASC
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(MateriauReception {
                materiau_id: row.get("MateriauID").unwrap(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                type_article: row.get::<&str, _>("TypeArticle").unwrap_or("").to_string(),
            });
        }
        Ok(list)
    }

    pub async fn create_bon_reception(
        client: &mut Client<Compat<TcpStream>>,
        fournisseur_id: i32,
        numero_br: &str
    ) -> Result<i32> {
        let sql = "INSERT INTO BonReception (FournisseurID, NumeroBR, DateImportation, Statut) OUTPUT INSERTED.BonReceptionID VALUES (@p1, @p2, GETDATE(), 'Validé')";
        let stream = client.query(sql, &[&fournisseur_id, &numero_br]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("BonReceptionID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create BonReception"))
    }

    pub async fn create_ligne_reception(
        client: &mut Client<Compat<TcpStream>>,
        bon_reception_id: i32,
        materiau_id: i32,
        quantite: f64,
        prix: f64
    ) -> Result<()> {
        let sql = "INSERT INTO LigneBonReception (BonReceptionID, MateriauID, QuantiteRecue, PrixAchat) VALUES (@p1, @p2, @p3, @p4)";
        client.execute(sql, &[&bon_reception_id, &materiau_id, &quantite, &prix]).await?;
        Ok(())
    }

    pub async fn get_historique_receptions(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<HistoriqueReception>> {
        let sql = "
            SELECT TOP 100 
                lbr.LigneBRID,
                CONVERT(varchar, br.DateImportation, 23) as Date,
                m.Reference,
                m.Designation,
                f.Nom as Fournisseur,
                CAST(lbr.QuantiteRecue AS FLOAT) as Quantite,
                CAST(lbr.PrixAchat AS FLOAT) as PrixAchat
            FROM LigneBonReception lbr
            JOIN BonReception br ON lbr.BonReceptionID = br.BonReceptionID
            JOIN Materiau m ON lbr.MateriauID = m.MateriauID
            JOIN Fournisseur f ON br.FournisseurID = f.FournisseurID
            ORDER BY br.DateImportation DESC, lbr.LigneBRID DESC
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(HistoriqueReception {
                id: row.get("LigneBRID").unwrap_or(0),
                date: row.get::<&str, _>("Date").unwrap_or("").to_string(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                fournisseur: row.get::<&str, _>("Fournisseur").unwrap_or("").to_string(),
                quantite: row.get("Quantite").unwrap_or(0.0),
                prix_unitaire: row.get("PrixAchat").unwrap_or(0.0),
                prix_total: row.get::<f64, _>("Quantite").unwrap_or(0.0) * row.get::<f64, _>("PrixAchat").unwrap_or(0.0),
            });
        }
        Ok(list)
    }

    pub async fn update_prix_achat(client: &mut Client<Compat<TcpStream>>, ligne_id: i32, nouveau_prix: f64) -> Result<()> {
        let sql = "UPDATE LigneBonReception SET PrixAchat = @p1 WHERE LigneBRID = @p2";
        client.execute(sql, &[&nouveau_prix, &ligne_id]).await?;
        Ok(())
    }

    pub async fn update_prix_catalogue(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, nouveau_prix: f64) -> Result<()> {
        let sql1 = "UPDATE ArticleStandard SET PrixUnitaire = @p1 WHERE MateriauID = @p2";
        client.execute(sql1, &[&nouveau_prix, &materiau_id]).await?;
        let sql2 = "UPDATE BarreAluminium SET PrixParMetre = @p1 WHERE MateriauID = @p2";
        client.execute(sql2, &[&nouveau_prix, &materiau_id]).await?;
        Ok(())
    }
}
