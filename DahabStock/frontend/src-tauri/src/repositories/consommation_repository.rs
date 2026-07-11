
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;

pub struct ConsommationRepository;
use crate::models::consommation::HistoriqueConsommation;

impl ConsommationRepository {
    pub async fn create_consommation(
        client: &mut Client<Compat<TcpStream>>,
        projet_id: i32,
        materiau_id: i32,
        qte: f64,
        longueur: f64,
        chute_id: Option<i32>,
        preneur: &str,
        source: &str
    ) -> Result<i32> {
        let sql = "INSERT INTO Consommation (ProjetID, MateriauID, DateOperation, QuantiteUtilisee, LongueurUtilisee, ChuteID, Preneur, SourceConsommation) OUTPUT INSERTED.ConsommationID VALUES (@p1, @p2, GETDATE(), @p3, @p4, @p5, @p6, @p7)";
        let stream = client.query(sql, &[&projet_id, &materiau_id, &qte, &longueur, &chute_id, &preneur, &source]).await?;
        let rows = stream.into_first_result().await?;
        if let Some(row) = rows.first() {
            let id: i32 = row.get("ConsommationID").unwrap();
            return Ok(id);
        }
        Err(anyhow::anyhow!("Failed to create consommation"))
    }

    pub async fn get_historique_consommations(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<HistoriqueConsommation>> {
        let sql = "
            SELECT TOP 100 
                c.ConsommationID,
                CONVERT(varchar, c.DateOperation, 23) as Date,
                m.Reference,
                m.Designation,
                CAST(p.CodeProjet AS NVARCHAR(50)) as Projet,
                CAST(c.QuantiteUtilisee AS FLOAT) as QuantiteUtilisee,
                CAST(c.QuantiteUtilisee AS FLOAT) as QuantiteUtilisee,
                CAST(c.LongueurUtilisee AS FLOAT) as LongueurUtilisee,
                ISNULL(c.Preneur, '') as Preneur,
                CAST(
                    CASE 
                        WHEN ast.MateriauID IS NOT NULL THEN c.QuantiteUtilisee * ast.PrixUnitaire
                        WHEN ba.MateriauID IS NOT NULL THEN c.LongueurUtilisee * ba.PrixParMetre
                        ELSE 0 
                    END
                AS FLOAT) as CoutTotal
            FROM Consommation c
            JOIN Materiau m ON c.MateriauID = m.MateriauID
            JOIN Projet p ON c.ProjetID = p.ProjetID
            LEFT JOIN ArticleStandard ast ON m.MateriauID = ast.MateriauID
            LEFT JOIN BarreAluminium ba ON m.MateriauID = ba.MateriauID
            ORDER BY c.DateOperation DESC, c.ConsommationID DESC
        ";
        let stream = client.query(sql, &[]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(HistoriqueConsommation {
                id: row.get("ConsommationID").unwrap_or(0),
                date: row.get::<&str, _>("Date").unwrap_or("").to_string(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                projet: row.get::<&str, _>("Projet").unwrap_or("").to_string(),
                quantite_utilisee: row.get::<f64, _>("QuantiteUtilisee").unwrap_or(0.0),
                longueur_utilisee: row.get::<f64, _>("LongueurUtilisee").unwrap_or(0.0),
                preneur: row.get::<&str, _>("Preneur").unwrap_or("").to_string(),
                cout_total: row.get::<f64, _>("CoutTotal").unwrap_or(0.0),
            });
        }
        Ok(list)
    }

    pub async fn get_consommations_by_projet(client: &mut Client<Compat<TcpStream>>, projet_id: i32) -> Result<Vec<HistoriqueConsommation>> {
        let sql = "
            SELECT 
                c.ConsommationID,
                CONVERT(varchar, c.DateOperation, 23) as DateOperation,
                m.Reference,
                m.Designation,
                CAST(p.CodeProjet AS NVARCHAR(50)) as Projet,
                CAST(c.QuantiteUtilisee AS FLOAT) as QuantiteUtilisee,
                CAST(c.LongueurUtilisee AS FLOAT) as LongueurUtilisee,
                c.Preneur,
                CAST(
                    CASE 
                        WHEN ast.MateriauID IS NOT NULL THEN c.QuantiteUtilisee * ast.PrixUnitaire
                        WHEN ba.MateriauID IS NOT NULL THEN c.LongueurUtilisee * ba.PrixParMetre
                        ELSE 0 
                    END
                AS FLOAT) as CoutTotal
            FROM Consommation c
            JOIN Materiau m ON c.MateriauID = m.MateriauID
            JOIN Projet p ON c.ProjetID = p.ProjetID
            LEFT JOIN ArticleStandard ast ON m.MateriauID = ast.MateriauID
            LEFT JOIN BarreAluminium ba ON m.MateriauID = ba.MateriauID
            WHERE c.ProjetID = @p1
            ORDER BY c.DateOperation DESC, c.ConsommationID DESC
        ";
        let stream = client.query(sql, &[&projet_id]).await?;
        let rows = stream.into_first_result().await?;
        let mut list = Vec::new();
        for row in rows {
            list.push(HistoriqueConsommation {
                id: row.get("ConsommationID").unwrap(),
                date: row.get::<&str, _>("DateOperation").unwrap_or("").to_string(),
                reference: row.get::<&str, _>("Reference").unwrap_or("").to_string(),
                designation: row.get::<&str, _>("Designation").unwrap_or("").to_string(),
                projet: row.get::<&str, _>("Projet").unwrap_or("").to_string(),
                quantite_utilisee: row.get::<f64, _>("QuantiteUtilisee").unwrap_or(0.0),
                longueur_utilisee: row.get::<f64, _>("LongueurUtilisee").unwrap_or(0.0),
                preneur: row.get::<&str, _>("Preneur").unwrap_or("").to_string(),
                cout_total: row.get::<f64, _>("CoutTotal").unwrap_or(0.0),
            });
        }
        Ok(list)
    }
}
