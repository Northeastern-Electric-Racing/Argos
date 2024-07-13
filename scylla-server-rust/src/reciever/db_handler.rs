use tokio::sync::mpsc::Receiver;

use tokio::{sync::mpsc::Sender, time::Duration};

use tokio_util::sync::CancellationToken;

use crate::{
    services::{
        data_service, data_type_service, driver_service, location_service, node_service,
        system_service,
    },
    Database,
};

/// The upload interval for batch uploads
const UPLOAD_INTERVAL: u64 = 5000;

use super::{ClientData, LocationData};

/// A struct defining an in progress location packet
struct LocLock {
    location_name: Option<String>,
    points: Option<(f64, f64)>,
    radius: Option<f64>,
}

impl LocLock {
    pub fn new() -> LocLock {
        LocLock {
            location_name: None,
            points: None,
            radius: None,
        }
    }

    /// Add the location name to the packet
    pub fn add_loc_name(&mut self, loc_name: String) {
        self.location_name = Some(loc_name);
    }

    /// Add points to the packet
    pub fn add_points(&mut self, lat: f64, long: f64) {
        self.points = Some((lat, long));
    }

    /// Add a radius to the packet
    pub fn add_radius(&mut self, radius: f64) {
        self.radius = Some(radius);
    }

    /// Attempt to finalize the packet, returning a location data and clearing this object or None if still in progress
    pub fn finalize(&mut self) -> Option<LocationData> {
        if self.location_name.is_some() && self.points.is_some() && self.radius.is_some() {
            self.clear();
            return Some(LocationData {
                location_name: self.location_name.clone().unwrap(),
                lat: self.points.unwrap().0,
                long: self.points.unwrap().1,
                radius: self.radius.unwrap(),
            });
        }
        None
    }

    /// Clear the internal state
    fn clear(&mut self) {
        self.location_name = None;
        self.points = None;
        self.radius = None;
    }
}

/// A few threads to manage the processing and inserting of special types,
/// upserting of metadata for data, and batch uploading the database
pub struct DbHandler {
    /// The list of nodes seen by this instance, used for when to upsert
    node_list: Vec<String>,
    /// The list of data types seen by this instance, used for when to upsert
    datatype_list: Vec<String>,
    /// The broadcast channel which provides serial datapoints for processing
    reciever: Receiver<ClientData>,
    /// The database
    db: Database,
    /// An internal state of an in progress location packet
    loc_lock: LocLock,
    /// Whether the location has been modified this loop
    is_loc: bool,
}

impl DbHandler {
    /// Make a new db handler
    /// * `recv` - the broadcast reciver of which clientdata will be sent
    pub fn new(reciever: Receiver<ClientData>, db: Database) -> DbHandler {
        DbHandler {
            node_list: vec![],
            datatype_list: vec![],
            reciever,
            db,
            loc_lock: LocLock::new(),
            is_loc: false,
        }
    }

    /// This loop handles batch uploading, and has no internal state or requirements
    /// It uses the queue from data queue to insert to the database specified
    /// On cancellation, will await one final queue message to cleanup anything remaining in the channel
    pub async fn batching_loop(
        mut data_queue: Receiver<Vec<ClientData>>,
        database: Database,
        cancel_token: CancellationToken,
    ) {
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    let final_msgs = data_queue.recv().await.expect("DB send could not shutdown cleanly!");
                    println!(
                        "Final Batch uploaded: {:?}",
                        data_service::add_many(&database, final_msgs).await
                    );
                    break;
                },
                Some(msg) = data_queue.recv() => {
                    println!(
                        "Batch uploaded: {:?}",
                        data_service::add_many(&database, msg).await
                    );
                }
            }
        }
    }

    /// A loop which uses self and a sender channel to process data
    /// If the data is special, i.e. coordinates, driver, etc. it will store it in its special location of the db immediately
    /// For all data points it will add the to the data_channel for batch uploading logic when a certain time has elapsed
    /// Before this time the data is stored in an internal queue.
    /// On cancellation, the messages currently in the queue will be sent as a final flush of any remaining messages recieved before cancellation
    pub async fn handling_loop(
        mut self,
        data_channel: Sender<Vec<ClientData>>,
        cancel_token: CancellationToken,
    ) {
        let mut data_queue: Vec<ClientData> = vec![];
        let mut last_time = tokio::time::Instant::now();
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    println!("Pushing final messages to queue");
                    data_channel.send(data_queue.clone()).await.expect("Could not comm data to db thread, shutdown");
                    data_queue.clear();
                    break;
                },
                Some(msg) = self.reciever.recv() => {

                    // If the time is greater than upload interval, push to batch upload thread and clear queue
                    if tokio::time::Instant::now().duration_since(last_time)
                    > Duration::from_millis(UPLOAD_INTERVAL) && !data_queue.is_empty()
                {
                    data_channel.send(data_queue.clone()).await.expect("Could not comm data to db thread");
                    data_queue.clear();
                    last_time = tokio::time::Instant::now();
                }

                // upsert if not present, a sort of cache of upserted types really
                if !self.node_list.contains(&msg.node) {
                    println!("Upserting node: {}", msg.node);
                    if let Err(msg) = node_service::upsert_node(&self.db, msg.node.clone()).await {
                        println!("DB error node upsert: {:?}", msg);
                    }
                    self.node_list.push(msg.node.clone());
                }
                if !self.datatype_list.contains(&msg.name) {
                    println!("Upserting data type: {}", msg.name);
                    if let Err(msg) = data_type_service::upsert_data_type(
                        &self.db,
                        msg.name.clone(),
                        msg.unit.clone(),
                        msg.node.clone(),
                    )
                    .await {
                        println!("DB error datatype upsert: {:?}", msg);
                    }
                    self.datatype_list.push(msg.name.clone());
                }

                // if data has some special meanings, push them to the database immediately, notably no matter what also enter batching logic
                match msg.name.as_str() {
                    "Driver" => {
                        if let Err(err) = driver_service::upsert_driver(
                            &self.db,
                            msg.values
                                .first()
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .to_string(),
                            msg.run_id,
                        )
                        .await {
                            println!("Driver upsert error: {:?}", err);
                        }
                    }
                    "location" => {
                        self.loc_lock.add_loc_name(
                            msg.values
                                .first()
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .to_string(),
                        );
                        self.is_loc = true;
                    }
                    "system" => {
                        if let Err(err) = system_service::upsert_system(
                            &self.db,
                            msg.values
                                .first()
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .to_string(),
                            msg.run_id,
                        )
                        .await {
                            println!("System upsert error: {:?}", err);
                        }
                    }
                    "GPS-Location" => {
                        self.loc_lock.add_points(
                            msg.values
                                .first()
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .parse::<f64>()
                                .unwrap_or_default(),
                            msg.values
                                .get(1)
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .parse::<f64>()
                                .unwrap_or_default(),
                        );
                        self.is_loc = true;
                    }
                    "Radius" => {
                        self.loc_lock.add_radius(
                            msg.values
                                .first()
                                .unwrap_or(&"PizzaTheHut".to_string())
                                .parse::<f64>()
                                .unwrap_or_default(),
                        );
                        self.is_loc = true;
                    }
                    _ => {}
                }
                // if location has been modified, push a new location of the loc lock object returns Some
                if self.is_loc {
                    if let Some(loc) = self.loc_lock.finalize() {
                        if let Err(err) = location_service::upsert_location(
                            &self.db,
                            loc.location_name,
                            loc.lat,
                            loc.long,
                            loc.radius,
                            msg.run_id,
                        )
                        .await {
                            println!("Location upsert error: {:?}", err);
                        }
                    }
                    self.is_loc = false;
                }

                // no matter what, batch upload the message
                data_queue.push(msg);
                }
            }
        }
    }
}
