use std::{sync::Arc, time::Duration};

use prisma_client_rust::{chrono, QueryError};
use scylla_server_rust::{
    prisma::PrismaClient,
    processors::ClientData,
    services::{
        data_service, data_type_service, driver_service, location_service, node_service,
        run_service, system_service,
    },
    Database,
};

#[tokio::main]
async fn main() -> Result<(), QueryError> {
    println!("Connecting and seeding!");
    let client: Database = Arc::new(
        PrismaClient::_builder()
            .build()
            .await
            .expect("Could not build prisma DB"),
    );

    client.data().delete_many(vec![]).exec().await?;

    client.data_type().delete_many(vec![]).exec().await?;

    client.driver().delete_many(vec![]).exec().await?;

    client.location().delete_many(vec![]).exec().await?;

    client.node().delete_many(vec![]).exec().await?;

    client.run().delete_many(vec![]).exec().await?;

    client.system().delete_many(vec![]).exec().await?;

    let created_run =
        run_service::create_run(&client, chrono::offset::Utc::now().timestamp_millis()).await?;

    system_service::upsert_system(&client, "Data And Controls".to_string(), created_run.id).await?;
    driver_service::upsert_driver(&client, "Fergus".to_string(), created_run.id).await?;
    location_service::upsert_location(
        &client,
        "Gainsborough".to_string(),
        1.0,
        1.0,
        1.0,
        created_run.id,
    )
    .await?;

    node_service::upsert_node(&client, "BMS".to_string()).await?;
    node_service::upsert_node(&client, "MPU".to_string()).await?;

    data_type_service::upsert_data_type(
        &client,
        "Pack-Temp".to_string(),
        "C".to_string(),
        "BMS".to_string(),
    )
    .await?;
    data_service::add_many(
        &client,
        vec![
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["20".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis(),
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["21".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 1000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["22".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 2000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["17".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 3000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["25".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 4000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["30".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 5000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["38".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 6000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["32".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 7000,
                node: "BMS".to_string(),
            },
            ClientData {
                run_id: created_run.id,
                name: "Pack-Temp".to_string(),
                unit: "C".to_string(),
                values: vec!["26".to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis() + 8000,
                node: "BMS".to_string(),
            },
        ],
    )
    .await?;

    data_type_service::upsert_data_type(
        &client,
        "Pack-Voltage".to_string(),
        "V".to_string(),
        "BMS".to_string(),
    )
    .await?;
    data_type_service::upsert_data_type(
        &client,
        "Pack-SOC".to_string(),
        "%".to_string(),
        "BMS".to_string(),
    )
    .await?;
    data_type_service::upsert_data_type(
        &client,
        "Pack-Current".to_string(),
        "A".to_string(),
        "BMS".to_string(),
    )
    .await?;
    data_type_service::upsert_data_type(
        &client,
        "Sense-Accel".to_string(),
        "G".to_string(),
        "MPU".to_string(),
    )
    .await?;
    data_type_service::upsert_data_type(
        &client,
        "Sense-Temperature".to_string(),
        "C".to_string(),
        "MPU".to_string(),
    )
    .await?;
    data_type_service::upsert_data_type(
        &client,
        "State-Speed".to_string(),
        "mph".to_string(),
        "MPU".to_string(),
    )
    .await?;

    node_service::upsert_node(&client, "TPU".to_string()).await?;
    data_type_service::upsert_data_type(
        &client,
        "Points".to_string(),
        "coords".to_string(),
        "TPU".to_string(),
    )
    .await?;

    simulate_route(client, created_run.id).await?;

    Ok(())
}

// lat,long
const NYC_COORDS: (f64, f64) = (40.7128, -74.006);
const LA_COORDS: (f64, f64) = (34.0522, -118.2437);
const STEP_NUM: u8 = 10;
async fn simulate_route(db: Database, curr_run: i32) -> Result<(), QueryError> {
    let step_lat = (LA_COORDS.0 - NYC_COORDS.0) / STEP_NUM as f64;
    let step_long = (LA_COORDS.1 - NYC_COORDS.1) / STEP_NUM as f64;

    for i in 0..STEP_NUM {
        // clamp to [-90,90]
        let inter_lat = (NYC_COORDS.0 + step_lat * i as f64).clamp(-90.0, 90.0);
        let inter_long = NYC_COORDS.1 + step_long * i as f64;

        data_service::add_data(
            &db,
            ClientData {
                run_id: curr_run,
                name: "Points".to_string(),
                unit: "Coord".to_string(),
                values: vec![inter_lat.to_string(), inter_long.to_string()],
                timestamp: chrono::offset::Utc::now().timestamp_millis(),
                node: "TPU".to_string(),
            },
        )
        .await?;

        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    Ok(())
}
