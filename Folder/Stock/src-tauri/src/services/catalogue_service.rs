
use anyhow::Result;
use tiberius::Client;
use tokio::net::TcpStream;
use tokio_util::compat::Compat;
use crate::models::catalogue::{ArticleStandardPayload, BarreAluminiumPayload, CatalogueItem};
use crate::repositories::catalogue_repository::CatalogueRepository;

pub struct CatalogueService;

impl CatalogueService {
    pub async fn add_article_standard(client: &mut Client<Compat<TcpStream>>, payload: ArticleStandardPayload) -> Result<()> {
        CatalogueRepository::add_article_standard(client, payload).await
    }

    pub async fn add_barre_aluminium(client: &mut Client<Compat<TcpStream>>, payload: BarreAluminiumPayload) -> Result<()> {
        CatalogueRepository::add_barre_aluminium(client, payload).await
    }

    pub async fn get_catalogue_complet(client: &mut Client<Compat<TcpStream>>) -> Result<Vec<CatalogueItem>> {
        CatalogueRepository::get_catalogue_complet(client).await
    }
}
