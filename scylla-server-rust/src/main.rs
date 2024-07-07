use std::sync::Arc;

use axum::{http::Method, routing::get, Router};
use scylla_server_rust::{
    controller::{
        self, data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    Database,
};
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    let client: Database = Arc::new(PrismaClient::_builder().build().await.unwrap());

    let app = Router::new()
        .route(
            "/data/:dataTypeName/:runId",
            get(controller::data_controller::get_data),
        )
        .route("/datatypes", get(data_type_controller::get_all_data_types))
        .route("/drivers", get(driver_controller::get_all_drivers))
        .route("/locations", get(location_controller::get_all_locations))
        .route("/nodes", get(node_controller::get_all_nodes))
        .route("/runs", get(run_controller::get_all_runs))
        .route("/runs/:id", get(run_controller::get_run_by_id))
        .route("/systems", get(system_controller::get_all_systems))
        .layer(
            CorsLayer::new()
                // allow `GET`
                .allow_methods([Method::GET])
                // allow requests from any origin
                .allow_origin(Any),
        )
        .with_state(client);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
