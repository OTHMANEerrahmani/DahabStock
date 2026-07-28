use serde::Serialize;
use tiberius::Query;
use crate::database::connection::get_connection;

#[derive(Serialize)]
pub struct DashboardStats {
    total_materiaux: i32,
    stock_faible: i32,
    total_chutes: i32,
    consommations_aujourdhui: i32,
    pertes_aujourdhui: i32,
    valeur_accessoires: f64,
    valeur_barres: f64,
}

#[derive(Serialize)]
pub struct DashboardResponse {
    status: String,
    data: Option<DashboardStats>,
    error: Option<String>,
}

#[tauri::command]
pub async fn get_dashboard_stats() -> String {
    match fetch_stats().await {
        Ok(stats) => {
            let res = DashboardResponse {
                status: "success".to_string(),
                data: Some(stats),
                error: None,
            };
            serde_json::to_string(&res).unwrap()
        }
        Err(e) => {
            let res = DashboardResponse {
                status: "error".to_string(),
                data: None,
                error: Some(crate::utils::format_sql_error(&e.to_string())),
            };
            serde_json::to_string(&res).unwrap()
        }
    }
}

async fn fetch_stats() -> anyhow::Result<DashboardStats> {
    let mut client = get_connection().await?;

    let mut total_materiaux = 0;
    if let Some(row) = client.simple_query("SELECT CAST(ISNULL(SUM(QuantiteDisponible), 0) AS INT) as cnt FROM StockPrincipal").await?.into_first_result().await?.first() {
        total_materiaux = row.get::<i32, _>("cnt").unwrap_or(0);
    }

    let mut stock_faible = 0;
    if let Some(row) = client.simple_query("SELECT COUNT(*) as cnt FROM StockPrincipal WHERE QuantiteDisponible < 10").await?.into_first_result().await?.first() {
        stock_faible = row.get::<i32, _>("cnt").unwrap_or(0);
    }

    let mut total_chutes = 0;
    if let Some(row) = client.simple_query("SELECT COUNT(*) as cnt FROM StockChutes WHERE Statut = 'Disponible'").await?.into_first_result().await?.first() {
        total_chutes = row.get::<i32, _>("cnt").unwrap_or(0);
    }

    let mut consommations_aujourdhui = 0;
    if let Some(row) = client.simple_query("SELECT COUNT(*) as cnt FROM Consommation WHERE CAST(DateOperation AS DATE) = CAST(GETDATE() AS DATE)").await?.into_first_result().await?.first() {
        consommations_aujourdhui = row.get::<i32, _>("cnt").unwrap_or(0);
    }

    let mut pertes_aujourdhui = 0;
    if let Some(row) = client.simple_query("SELECT COUNT(*) as cnt FROM Perte WHERE CAST(DateDeclaration AS DATE) = CAST(GETDATE() AS DATE)").await?.into_first_result().await?.first() {
        pertes_aujourdhui = row.get::<i32, _>("cnt").unwrap_or(0);
    }

    let mut valeur_accessoires = 0.0;
    let sql_valeur_accessoires = "
        SELECT CAST(ISNULL(SUM(sp.QuantiteDisponible * ast.PrixUnitaire), 0) AS FLOAT) as valeur
        FROM StockPrincipal sp
        JOIN ArticleStandard ast ON sp.MateriauID = ast.MateriauID
    ";
    if let Some(row) = client.simple_query(sql_valeur_accessoires).await?.into_first_result().await?.first() {
        valeur_accessoires = row.get::<f64, _>("valeur").unwrap_or(0.0);
    }

    let mut valeur_barres = 0.0;
    let sql_valeur_barres = "
        SELECT CAST(ISNULL(SUM(sp.QuantiteDisponible * ba.PrixParMetre), 0) AS FLOAT) as valeur
        FROM StockPrincipal sp
        JOIN BarreAluminium ba ON sp.MateriauID = ba.MateriauID
    ";
    if let Some(row) = client.simple_query(sql_valeur_barres).await?.into_first_result().await?.first() {
        valeur_barres = row.get::<f64, _>("valeur").unwrap_or(0.0);
    }

    Ok(DashboardStats {
        total_materiaux,
        stock_faible,
        total_chutes,
        consommations_aujourdhui,
        pertes_aujourdhui,
        valeur_accessoires,
        valeur_barres,
    })
}