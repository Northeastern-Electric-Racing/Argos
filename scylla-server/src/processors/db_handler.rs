use tokio::sync::mpsc::Receiver;

use tokio::{sync::mpsc::Sender, time::Duration};

use tokio_util::sync::CancellationToken;
use tracing::{debug, info, instrument, trace, warn, Level};

use crate::{
    services::{
        data_service, data_type_service, driver_service, location_service, node_service,
        system_service,
    },
    Database,
};

use super::{ClientData, LocationData};

/// A struct defining an in progress location packet
struct LocLock {
    location_name: Option<String>,
    points: Option<(f32, f32)>,
    radius: Option<f32>,
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
    pub fn add_points(&mut self, lat: f32, long: f32) {
        self.points = Some((lat, long));
    }

    /// Add a radius to the packet
    pub fn add_radius(&mut self, radius: f32) {
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
    receiver: Receiver<ClientData>,
    /// The database
    db: Database,
    /// An internal state of an in progress location packet
    location_lock: LocLock,
    /// Whether the location has been modified this loop
    is_location: bool,
    /// the queue of data
    data_queue: Vec<ClientData>,
    /// the time since last batch
    last_time: tokio::time::Instant,
    /// upload interval
    upload_interval: u64,
}

impl DbHandler {
    /// Make a new db handler
    /// * `recv` - the broadcast reciver of which clientdata will be sent
    pub fn new(receiver: Receiver<ClientData>, db: Database, upload_interval: u64) -> DbHandler {
        DbHandler {
            node_list: vec![],
            datatype_list: vec![],
            receiver,
            db,
            location_lock: LocLock::new(),
            is_location: false,
            data_queue: vec![],
            last_time: tokio::time::Instant::now(),
            upload_interval,
        }
    }

    /// This loop handles batch uploading, and has no internal state or requirements
    /// It uses the queue from data queue to insert to the database specified
    /// On cancellation, will await one final queue message to cleanup anything remaining in the channel
    pub async fn batching_loop(
        mut batch_queue: Receiver<Vec<ClientData>>,
        database: Database,
        saturate_batches: bool,
        cancel_token: CancellationToken,
    ) {
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    // cleanup all remaining messages if batches start backing up
                    while let Some(final_msgs) = batch_queue.recv().await {
                        info!("{} batches remaining!", batch_queue.len()+1);
                    info!(
                        "A cleanup batch uploaded: {:?}",
                        data_service::add_many(&database, final_msgs).await
                    );
                    }
                    info!("No more messages to cleanup.");
                    break;
                },
                Some(msgs) = batch_queue.recv() => {
                    if saturate_batches {
                        let shared_db = database.clone();
                        tokio::spawn(async move {
                            Self::batch_upload(msgs, &shared_db).await;
                         });
                    } else {
                        Self::batch_upload(msgs, &database).await;
                    }
                    debug!(
                        "DB send: {} of {}",
                        batch_queue.len(),
                        batch_queue.max_capacity()
                    );
                }
            }
        }
    }

    /// A batching loop that consumes messages but does not upload anything
    pub async fn fake_batching_loop(
        mut batch_queue: Receiver<Vec<ClientData>>,
        cancel_token: CancellationToken,
    ) {
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    warn!("Cancelling fake upload with {} batches left in queue!", batch_queue.len());
                    break;
                },
                Some(msgs) = batch_queue.recv() => {
                    warn!("NOT UPLOADING {} MESSAGES", msgs.len());
                },
            }
        }
    }

    #[instrument(level = Level::DEBUG, skip(msg))]
    async fn batch_upload(msg: Vec<ClientData>, db: &Database) {
        match data_service::add_many(db, msg).await {
            Ok(count) => info!("Batch uploaded: {:?}", count),
            Err(err) => warn!("Error in batch upload: {:?}", err),
        }
    }

    /// A loop which uses self and a sender channel to process data
    /// If the data is special, i.e. coordinates, driver, etc. it will store it in its special location of the db immediately
    /// For all data points it will add the to the data_channel for batch uploading logic when a certain time has elapsed
    /// Before this time the data is stored in an internal queue.
    /// On cancellation, the messages currently in the queue will be sent as a final flush of any remaining messages received before cancellation
    pub async fn handling_loop(
        mut self,
        data_channel: Sender<Vec<ClientData>>,
        cancel_token: CancellationToken,
    ) {
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    debug!("Pushing final messages to queue");
                    data_channel.send(self.data_queue.clone()).await.expect("Could not comm data to db thread, shutdown");
                    self.data_queue.clear();
                    break;
                },
                Some(msg) = self.receiver.recv() => {
                    self.handle_msg(msg, &data_channel).await;
                }
            }
        }
    }

    #[instrument(skip(self), level = Level::TRACE)]
    async fn handle_msg(&mut self, msg: ClientData, data_channel: &Sender<Vec<ClientData>>) {
        trace!(
            "Mqtt dispatcher: {} of {}",
            self.receiver.len(),
            self.receiver.max_capacity()
        );

        // If the time is greater than upload interval, push to batch upload thread and clear queue
        if tokio::time::Instant::now().duration_since(self.last_time)
            > Duration::from_millis(self.upload_interval)
            && !self.data_queue.is_empty()
        {
            data_channel
                .send(self.data_queue.clone())
                .await
                .expect("Could not comm data to db thread");
            self.data_queue.clear();
            self.last_time = tokio::time::Instant::now();
        }

        // upsert if not present, a sort of cache of upserted types really
        if !self.node_list.contains(&msg.node) {
            info!("Upserting node: {}", msg.node);
            if let Err(msg) = node_service::upsert_node(&self.db, msg.node.clone()).await {
                warn!("DB error node upsert: {:?}", msg);
            }
            self.node_list.push(msg.node.clone());
        }
        if !self.datatype_list.contains(&msg.name) {
            info!("Upserting data type: {}", msg.name);
            if let Err(msg) = data_type_service::upsert_data_type(
                &self.db,
                msg.name.clone(),
                msg.unit.clone(),
                msg.node.clone(),
            )
            .await
            {
                warn!("DB error datatype upsert: {:?}", msg);
            }
            self.datatype_list.push(msg.name.clone());
        }

        // if data has some special meanings, push them to the database immediately, notably no matter what also enter batching logic
        match msg.name.as_str() {
            // TODO remove driver from here, as driver is not car sourced
            "Driver" => {
                debug!("Upserting driver: {:?}", msg.values);
                if let Err(err) = driver_service::upsert_driver(
                    &self.db,
                    (*msg.values.first().unwrap_or(&0.0f32)).to_string(),
                    msg.run_id,
                )
                .await
                {
                    warn!("Driver upsert error: {:?}", err);
                }
            }
            // TODO see above
            "location" => {
                debug!("Upserting location name: {:?}", msg.values);
                self.location_lock
                    .add_loc_name((*msg.values.first().unwrap_or(&0.0f32)).to_string());
                self.is_location = true;
            }
            // TODO see above
            "system" => {
                debug!("Upserting system: {:?}", msg.values);
                if let Err(err) = system_service::upsert_system(
                    &self.db,
                    (*msg.values.first().unwrap_or(&0.0f32)).to_string(),
                    msg.run_id,
                )
                .await
                {
                    warn!("System upsert error: {:?}", err);
                }
            }
            "GPS-Location" => {
                debug!("Upserting location points: {:?}", msg.values);
                self.location_lock.add_points(
                    *msg.values.first().unwrap_or(&0.0f32),
                    *msg.values.get(1).unwrap_or(&0.0f32),
                );
                self.is_location = true;
            }
            "Radius" => {
                debug!("Upserting location radius: {:?}", msg.values);
                self.location_lock
                    .add_radius(*msg.values.first().unwrap_or(&0.0f32));
                self.is_location = true;
            }
            _ => {}
        }
        // if location has been modified, push a new location of the loc lock object returns Some
        if self.is_location {
            trace!("Checking location status...");
            if let Some(loc) = self.location_lock.finalize() {
                debug!("Upserting location: {:?}", loc);
                if let Err(err) = location_service::upsert_location(
                    &self.db,
                    loc.location_name,
                    loc.lat as f64,
                    loc.long as f64,
                    loc.radius as f64,
                    msg.run_id,
                )
                .await
                {
                    warn!("Location upsert error: {:?}", err);
                }
            }
            self.is_location = false;
        }

        // no matter what, batch upload the message
        trace!("Pushing msg to queue: {:?}", msg);
        self.data_queue.push(msg);
    }
}
