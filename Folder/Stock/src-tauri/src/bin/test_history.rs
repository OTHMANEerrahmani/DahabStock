use frontend_lib::database::connection::get_connection;
use tokio;

#[tokio::main]
async fn main() {
    let mut client = match get_connection().await {
        Ok(c) => c,
        Err(e) => { println!("DB Error: {:?}", e); return; }
    };
    let accessoires = vec![
        ("300.281", "Équerre à pion"),
        ("300.653", "Gâche à glisser"),
        ("900.680", "Pêne"),
        ("0299.250", "Noir (Fermeture encastrée Comfort 300)"),
        ("0299.261", "Laq. Blanc (Fermeture encastrée Comfort 300)"),
        ("0299.297", "Naturel (Fermeture encastrée Comfort 300)"),
        ("305.001", "Clapet anti-retour à bille"),
        ("305.003", "Busette à clapet anti-retour"),
        ("300.002", "Kit d'étanchéité (2 rails)"),
        ("1114", "Équerre (3 rails)"),
        ("200.281", "Équerre dormant et ouvrant"),
        ("100.136", "Équerre à pion"),
        ("300.322", "Bouchons KCL 323"),
        ("300.323", "Bouchons KCL 322"),
        ("300.306", "Bouchons KCL 331"),
        ("100.132", "Équerre / galet pour moustiquaire"),
        ("JMC", "Joint boudin"),
        ("BP 48500", "Joint brosse"),
        ("A200.232", "Joint extérieur 2 mm"),
        ("A200.204", "Joint de bourrage 4 mm tournant"),
        ("A200.206", "Joint de bourrage 6 mm tournant"),
        ("A300.006", "Joint vitrage 6 mm"),
        ("A300.008", "Joint vitrage 8 mm"),
        ("A300.010", "Joint vitrage 10 mm"),
        ("A300.018", "Joint vitrage 18 mm"),
        ("A300.020", "Joint vitrage 20 mm"),
        ("7005", "Joint brosse 7/5"),
    ];

    let sql1 = "
        UPDATE ArticleStandard 
        SET PrixUnitaire = latest.PrixAchat
        FROM ArticleStandard a
        INNER JOIN (
            SELECT MateriauID, PrixAchat,
            ROW_NUMBER() OVER (PARTITION BY MateriauID ORDER BY LigneBRID DESC) as rn
            FROM LigneBonReception
        ) latest ON a.MateriauID = latest.MateriauID AND latest.rn = 1
    ";
    let _ = client.execute(sql1, &[]).await;

    let sql2 = "
        UPDATE BarreAluminium 
        SET PrixParMetre = latest.PrixAchat
        FROM BarreAluminium b
        INNER JOIN (
            SELECT MateriauID, PrixAchat,
            ROW_NUMBER() OVER (PARTITION BY MateriauID ORDER BY LigneBRID DESC) as rn
            FROM LigneBonReception
        ) latest ON b.MateriauID = latest.MateriauID AND latest.rn = 1
    ";
    let _ = client.execute(sql2, &[]).await;
    println!("Prices synced successfully");



}
