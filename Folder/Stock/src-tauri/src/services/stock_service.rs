
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::stock::CompatibleChute;
use crate::repositories::stock_repository::StockRepository;

pub struct StockService;

impl StockService {
    pub async fn update_stock_principal(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, quantity_change: i32) -> Result<()> {
        StockRepository::update_stock_principal(client, materiau_id, quantity_change).await
    }

    pub async fn find_compatible_chute(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, required_length: f64) -> Result<Option<CompatibleChute>> {
        StockRepository::find_compatible_chute(client, materiau_id, required_length).await
    }

    pub async fn consume_chute(client: &mut Client<Compat<TcpStream>>, chute_id: i32) -> Result<()> {
        StockRepository::consume_chute(client, chute_id).await
    }
    
    pub async fn add_chute(client: &mut Client<Compat<TcpStream>>, materiau_id: i32, length: f64) -> Result<i32> {
        StockRepository::add_chute(client, materiau_id, length).await
    }
}
