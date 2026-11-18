// shim: Socket.IO rooms (#803 optimized)
use super::*;
use std::sync::Arc;
type Ctx = Arc<Subscriptions>;
fn setup() -> (SocketIo, Ctx) {
    let (_svc, io) = SocketIo::new_svc();
    let subs = Arc::new(Subscriptions::default());
    let ns_subs = subs.clone();
    io.ns("/", async move |socket: SocketRef| {
        ns_subs.register(&socket).await;
        let subs = ns_subs.clone();
        socket.on_disconnect(async move |socket: SocketRef| subs.unregister(socket.id).await);
    });
    (io, subs)
}
async fn apply(ctx: &Ctx, socket: &SocketRef, topics: Vec<String>) -> usize {
    ctx.set_subscriptions(socket, topics).await
}
async fn emit(ctx: &Ctx, io: &SocketIo, data: &ClientData) {
    let _ = ctx.emit_data(io, data).await;
}
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use std::time::{Duration, Instant};
use tokio::sync::mpsc::Sender;

const CLIENTS: usize = 15;
const TOPICS: usize = 900;
const RUNS: usize = 300;
const EMITS: usize = 5000;

fn topic(i: usize) -> String {
    format!("BMS/Segment{}/Cell{}/Voltage", i / 30, i % 30)
}

fn data(name: String) -> ClientData {
    ClientData {
        run_id: 1,
        name,
        unit: "V".to_string(),
        values: vec![3.71],
        timestamp: chrono::DateTime::from_timestamp_millis(1_700_000_000_000).unwrap(),
    }
}

async fn connect(io: &SocketIo, known: &mut HashSet<Sid>) -> (SocketRef, Sender<engineioxide::Packet>) {
    let (tx, mut rx) = io.new_dummy_sock("/", ()).await;
    rx.recv().await.unwrap();
    tokio::spawn(async move { while rx.recv().await.is_some() {} });
    let socket = loop {
        if let Some(s) = io.sockets().into_iter().find(|s| !known.contains(&s.id)) {
            break s;
        }
        tokio::time::sleep(Duration::from_millis(1)).await;
    };
    known.insert(socket.id);
    (socket, tx)
}

fn report(label: &str, mut samples: Vec<Duration>) {
    samples.sort_unstable();
    let us = |d: Duration| d.as_secs_f64() * 1e6;
    let n = samples.len();
    let mean = samples.iter().sum::<Duration>() / n as u32;
    println!(
        "FAIR {label:<44} n={n:<6} p50={:>9.2} p99={:>9.2} max={:>9.2} mean={:>8.2}",
        us(samples[n / 2]),
        us(samples[(n * 99 / 100).min(n - 1)]),
        us(samples[n - 1]),
        us(mean),
    );
}

async fn timed_apply(ctx: &Ctx, socket: &SocketRef, topics: &[String]) -> Duration {
    let topics = topics.to_vec();
    let start = Instant::now();
    let count = apply(ctx, socket, topics).await;
    let elapsed = start.elapsed();
    assert!(count > 0);
    elapsed
}

async fn first_set_runs(io: &SocketIo, ctx: &Ctx, known: &mut HashSet<Sid>, page: &[String]) -> Vec<Duration> {
    let mut samples = Vec::with_capacity(RUNS);
    for _ in 0..RUNS {
        let (socket, _tx) = connect(io, known).await;
        samples.push(timed_apply(ctx, &socket, page).await);
        socket.disconnect().unwrap();
        tokio::time::sleep(Duration::from_millis(1)).await;
    }
    samples
}

async fn timed_emit(ctx: &Ctx, io: &SocketIo, data: &ClientData) -> Duration {
    let start = Instant::now();
    emit(ctx, io, data).await;
    let elapsed = start.elapsed();
    tokio::task::yield_now().await;
    elapsed
}

async fn emit_runs(io: &SocketIo, ctx: &Ctx, data: &ClientData) -> Vec<Duration> {
    let mut samples = Vec::with_capacity(EMITS);
    for _ in 0..EMITS {
        samples.push(timed_emit(ctx, io, data).await);
    }
    samples
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "benchmark"]
async fn fair_bench() {
    let topics: Vec<String> = (0..TOPICS).map(topic).collect();
    let page_a = &topics[0..490];
    let page_b = &topics[410..900];
    let (io, ctx) = setup();
    let mut known = HashSet::new();

    report("(a) first set, fresh, alone", first_set_runs(&io, &ctx, &mut known, page_a).await);

    let mut others = vec![];
    for _ in 0..CLIENTS - 1 {
        let (socket, tx) = connect(&io, &mut known).await;
        apply(&ctx, &socket, page_a.to_vec()).await;
        others.push((socket, tx));
    }
    // warm any lazy state, as live traffic would
    for t in &topics {
        emit(&ctx, &io, &data(t.clone())).await;
        tokio::task::yield_now().await;
    }
    tokio::time::sleep(Duration::from_millis(50)).await;

    report("(b) first set, others on page A", first_set_runs(&io, &ctx, &mut known, page_a).await);

    let (switcher, _switcher_tx) = connect(&io, &mut known).await;
    apply(&ctx, &switcher, page_a.to_vec()).await;
    let watched = data(topics[0].clone());
    let overlap = data(topics[450].clone());

    let mut sw = Vec::with_capacity(RUNS * 2);
    let mut first = Vec::with_capacity(RUNS * 2);
    for _ in 0..RUNS {
        for page in [page_b, page_a] {
            sw.push(timed_apply(&ctx, &switcher, page).await);
            first.push(timed_emit(&ctx, &io, &overlap).await);
        }
    }
    report("(c) page switch A<->B", sw);
    report("(c') first emit after a switch", first);

    report("(d) emit, watched by all 15", emit_runs(&io, &ctx, &watched).await);
    report("(e) emit, nobody watches", emit_runs(&io, &ctx, &data(topics[899].clone())).await);

    let stop = std::sync::Arc::new(AtomicBool::new(false));
    let switching = {
        let stop = stop.clone();
        let ctx = ctx.clone();
        let (a, b) = (page_a.to_vec(), page_b.to_vec());
        tokio::spawn(async move {
            let mut flips = 0u32;
            while !stop.load(AtomicOrdering::Relaxed) {
                let page = if flips % 2 == 0 { &b } else { &a };
                apply(&ctx, &switcher, page.clone()).await;
                flips += 1;
                tokio::task::yield_now().await;
            }
            flips
        })
    };
    let mut samples = vec![];
    let start = Instant::now();
    while start.elapsed() < Duration::from_secs(2) {
        samples.push(timed_emit(&ctx, &io, &watched).await);
    }
    stop.store(true, AtomicOrdering::Relaxed);
    let flips = switching.await.unwrap();
    report("(f) emit during nonstop switching", samples);
    println!("FAIR switches {flips} emits_in_2s");
    drop(others);
}
