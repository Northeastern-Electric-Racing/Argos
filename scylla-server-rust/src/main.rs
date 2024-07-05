use std::sync::Arc;

use axum::{routing::get, Extension, Router};
use scylla_server_rust::{controller, prisma::PrismaClient};

#[tokio::main]
async fn main() {
    let client = Arc::new(PrismaClient::_builder().build().await.unwrap());

    let app = Router::new().route(
        "/data/:dataTypeName/:runId",
        get(controller::data_controller::get_data).layer(Extension(client)),
    );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
