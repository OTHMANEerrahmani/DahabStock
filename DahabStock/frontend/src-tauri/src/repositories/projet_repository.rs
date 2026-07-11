use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::projet::{Projet, ProjetStats};

pub struct ProjetRepository;

impl ProjetRepository {
    pub async fn get_projets(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<Projet>> {
        let stream = client.query("SELECT ProjetID, CAST(CodeProjet AS NVARCHAR(50)) AS CodeProjet, Statut FROM Projet ORDER BY CodeProjet", &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(Projet {
                id: row.get("ProjetID").unwrap_or(0),
                code_projet: row.get::<&str, _>("CodeProjet").unwrap_or("").to_string(),
                statut: row.get::<&str, _>("Statut").unwrap_or("En cours").to_string(),
            });
        }
        Ok(list)
    }

    pub async fn get_or_create_projet(client: &mut Client<Compat<TcpStream>>, code_projet: &str) -> Result<i32> {
        let stream = client.query("SELECT ProjetID, Statut FROM Projet WHERE CAST(CodeProjet AS NVARCHAR(50)) = @p1", &[&code_projet]).await?;
        let rows = stream.into_first_result().await?;
        
        if let Some(row) = rows.first() {
            let statut = row.get::<&str, _>("Statut").unwrap_or("En cours");
            let projet_id = row.get::<i32, _>("ProjetID").unwrap();
            if statut == "Terminé" {
                return Err(anyhow::anyhow!("Ce projet est terminé, impossible d'ajouter de nouvelles consommations."));
            }
            return Ok(projet_id);
        }

        // Create new
        let insert_sql = "INSERT INTO Projet (CodeProjet) OUTPUT INSERTED.ProjetID VALUES (@p1)";
        let stream = client.query(insert_sql, &[&code_projet]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            return Ok(row.get::<i32, _>("ProjetID").unwrap());
        }
        
        Err(anyhow::anyhow!("Failed to create project"))
    }

    pub async fn get_projets_suivi(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<ProjetStats>> {
        let sql = "
            SELECT 
                p.ProjetID, 
                CAST(p.CodeProjet AS NVARCHAR(50)) AS CodeProjet, 
                p.Statut,
                ISNULL(CAST(SUM(c.QuantiteUtilisee) AS INT), 0) as TotalPieces,
                CAST(SUM(
                    CASE 
                        WHEN ast.MateriauID IS NOT NULL THEN c.QuantiteUtilisee * ast.PrixUnitaire
                        WHEN ba.MateriauID IS NOT NULL THEN c.LongueurUtilisee * ba.PrixParMetre
                        ELSE 0 
                    END
                ) AS FLOAT) as CoutTotal
            FROM Projet p
            LEFT JOIN Consommation c ON p.ProjetID = c.ProjetID
            LEFT JOIN Materiau m ON c.MateriauID = m.MateriauID
            LEFT JOIN ArticleStandard ast ON m.MateriauID = ast.MateriauID
            LEFT JOIN BarreAluminium ba ON m.MateriauID = ba.MateriauID
            GROUP BY p.ProjetID, p.CodeProjet, p.Statut
            ORDER BY p.CodeProjet
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(ProjetStats {
                id: row.get("ProjetID").unwrap_or(0),
                code_projet: row.get::<&str, _>("CodeProjet").unwrap_or("").to_string(),
                statut: row.get::<&str, _>("Statut").unwrap_or("En cours").to_string(),
                total_pieces: row.get::<i32, _>("TotalPieces").unwrap_or(0),
                cout_total: row.get::<f64, _>("CoutTotal").unwrap_or(0.0),
            });
        }
        Ok(list)
    }

    pub async fn update_projet_statut(client: &mut Client<Compat<TcpStream>>, projet_id: i32, statut: &str) -> Result<()> {
        let sql = "UPDATE Projet SET Statut = @p1 WHERE ProjetID = @p2";
        client.execute(sql, &[&statut, &projet_id]).await?;
        Ok(())
    }
}
