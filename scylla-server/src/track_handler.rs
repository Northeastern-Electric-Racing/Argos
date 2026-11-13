use std::{collections::BTreeMap, sync::Arc, time::Duration};

use serde::Serialize;
use socketioxide::{BroadcastError, SocketIo};
use tokio::sync::{Mutex, Notify, broadcast};
use tokio_util::sync::CancellationToken;
use tracing::{debug, info, trace, warn};

use crate::{
    ArgosPoolHandle, ClientData,
    error::ScyllaError,
    lap_timing::{GPS_LOCATION_TOPIC, GpsFix, Lap, LapTimer, TimingLine},
    services::track_service,
    transformers::track_transformer::PublicTrack,
};

const TRACKS_SOCKET_KEY: &str = "tracks";
const LAPS_SOCKET_KEY: &str = "laps";

/// The browser draws every trace fix and searches them on each mouse move
const MAX_TRACE_FIXES: usize = 10_000;
/// GPS fixes queue behind a track load in this task, so a database that stops answering must not hold it longer
const LOAD_TRACKS_TIMEOUT: Duration = Duration::from_secs(1);

/// Wakes the track handler to reload the tracks after a route changes them
#[derive(Clone, Default)]
pub struct TracksChanged(pub Arc<Notify>);

/// The live run, kept by the track handler and read by the trace route
#[derive(Clone, Default)]
pub struct LiveRunHandle(pub Arc<Mutex<LiveRun>>);

/// The current run's laps on each track, as sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct RunLaps<'a> {
    #[serde(rename = "runId")]
    pub run_id: i32,
    /// By track id
    pub laps: BTreeMap<i32, &'a [Lap]>,
}

/// The current run's GPS fixes and the laps they time on each track with a start line
#[derive(Default)]
pub struct LiveRun {
    run_id: i32,
    fixes: Vec<GpsFix>,
    lines: Vec<(i32, TimingLine, Option<TimingLine>)>,
    timers: BTreeMap<i32, LapTimer>,
}

impl LiveRun {
    /// Times a fix of `run_id`, starting over when a new run begins; a fix no newer than the last is dropped
    pub fn push(&mut self, run_id: i32, fix: GpsFix) {
        if run_id != self.run_id {
            self.run_id = run_id;
            self.fixes.clear();
            self.retime();
        }
        if self
            .fixes
            .last()
            .is_some_and(|last| fix.time_ms <= last.time_ms)
        {
            return;
        }
        self.fixes.push(fix);
        for timer in self.timers.values_mut() {
            timer.push(fix);
        }
    }

    /// Times the run's fixes again on the lines of `tracks`
    pub fn set_tracks(&mut self, tracks: &[PublicTrack]) {
        self.lines = tracks
            .iter()
            .filter_map(|track| Some((track.id, track.start_line?, track.finish_line)))
            .collect();
        self.retime();
    }

    /// The fixes of `run_id` so far, every nth so a long run stays drawable, or none if it isn't the live run
    #[must_use]
    pub fn trace(&self, run_id: i32) -> Vec<GpsFix> {
        if run_id != self.run_id {
            return Vec::new();
        }
        let every = self.fixes.len().div_ceil(MAX_TRACE_FIXES).max(1);
        self.fixes.iter().step_by(every).copied().collect()
    }

    #[must_use]
    pub fn run_laps(&self) -> RunLaps<'_> {
        RunLaps {
            run_id: self.run_id,
            laps: self
                .timers
                .iter()
                .map(|(&track_id, timer)| (track_id, timer.laps()))
                .collect(),
        }
    }

    fn retime(&mut self) {
        self.timers = self
            .lines
            .iter()
            .map(|&(track_id, start, finish)| {
                (track_id, LapTimer::from_fixes(&self.fixes, start, finish))
            })
            .collect();
    }
}

/// Times the current run's laps on every track as GPS fixes arrive, and sends every client the tracks and those laps
/// each second and whenever the tracks change
pub async fn track_handler(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    argos_pool: ArgosPoolHandle,
    TracksChanged(tracks_changed): TracksChanged,
    LiveRunHandle(live_run): LiveRunHandle,
    io: SocketIo,
) {
    info!(task = "track_handler", "starting");
    let mut tracks: Vec<PublicTrack> = Vec::new();
    let mut tracks_current = false;
    let mut send_interval = tokio::time::interval(Duration::from_secs(1));
    loop {
        tokio::select! {
            // queued data first, so a slow track load on a tick can't leave GPS fixes waiting behind the next one
            biased;
            () = cancel_token.cancelled() => {
                debug!("Shutting down track handler!");
                break;
            },
            () = tracks_changed.notified() => {
                tracks_current = reload_tracks(&argos_pool, &mut tracks, &live_run).await;
                send(&io, &tracks, &live_run).await;
            },
            res = data_channel.recv() => {
                match res {
                    Ok(data) => {
                        if data.name == GPS_LOCATION_TOPIC && let [lat, lon, ..] = data.values[..] {
                            live_run.lock().await.push(data.run_id, GpsFix::new(lat, lon, data.timestamp.timestamp_micros()));
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        warn!("Track handler lagged behind, skipped {} messages!", n);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        debug!("Socket data channel closed, shutting down track handler!");
                        break;
                    }
                }
            },
            _ = send_interval.tick() => {
                // the first tick is immediate, so this loads the tracks on start and retries a failed load
                if !tracks_current {
                    tracks_current = reload_tracks(&argos_pool, &mut tracks, &live_run).await;
                }
                send(&io, &tracks, &live_run).await;
            },
        }
    }
}

/// Loads the tracks and times the run on them, returning whether it could
async fn reload_tracks(
    argos_pool: &ArgosPoolHandle,
    tracks: &mut Vec<PublicTrack>,
    live_run: &Mutex<LiveRun>,
) -> bool {
    match tokio::time::timeout(LOAD_TRACKS_TIMEOUT, load_tracks(argos_pool)).await {
        Ok(Ok(loaded)) => {
            *tracks = loaded;
            live_run.lock().await.set_tracks(tracks);
            true
        }
        Ok(Err(err)) => {
            warn!("Could not load the tracks: {:?}", err);
            false
        }
        Err(_) => {
            warn!("Timed out loading the tracks");
            false
        }
    }
}

async fn load_tracks(argos_pool: &ArgosPoolHandle) -> Result<Vec<PublicTrack>, ScyllaError> {
    // without the database there are no tracks, rather than a load to retry
    let Some(pool) = &argos_pool.0 else {
        return Ok(Vec::new());
    };
    let mut db = pool.get().await?;
    let tracks = track_service::get_all_tracks(&mut db).await?;
    Ok(tracks.into_iter().map(PublicTrack::from).collect())
}

async fn send(io: &SocketIo, tracks: &[PublicTrack], live_run: &Mutex<LiveRun>) {
    emit(io, TRACKS_SOCKET_KEY, tracks).await;
    emit(io, LAPS_SOCKET_KEY, &live_run.lock().await.run_laps()).await;
}

/// Logs a failed emit as `send_socket_msg` does: a transmit error is routine, any other is a bug
async fn emit<T: Serialize + ?Sized>(io: &SocketIo, socket_key: &str, data: &T) {
    match io.emit(socket_key, data).await {
        Ok(()) => (),
        Err(BroadcastError::Socket(e)) => trace!("Socket: Transmit error: {:?}", e),
        Err(err) => warn!("Socket: {} error: {}", socket_key, err),
    }
}
