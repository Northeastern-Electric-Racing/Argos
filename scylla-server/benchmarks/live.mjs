// Live end-to-end benchmark for selective delivery (epic #991, ADR 0009).
//
// Connects N Socket.IO clients to a running scylla-server, each with its own
// topic list, and reports per client: data msgs/s, bytes/s, distinct topics,
// and the client process's CPU; plus the server process's CPU when its pid is
// given. Each client runs in its own Node process so its CPU is its own.
//
//   node live.mjs --url http://localhost:8121 --clients old,bms,small,empty \
//     [--server-pid PID] [--label rooms] [--warmup 5] [--secs 30] \
//     [--topics results/topics-sample.json] [--sample-secs 10] [--out results/x.json]
//   node live.mjs --url ... --sample-only --sample-out results/topics-sample.json
//
// Client kinds:
//   old    no topic list: every topic (an old client, or any client on develop)
//   bms    the BMS page: every BMS/ topic, sent in the handshake auth
//   small  a small page (~10-30 topics), sent with set_subscriptions after connect
//   empty  an empty list, sent with set_subscriptions after connect
// `kind*n` repeats a kind, e.g. `small*8`; small clients rotate over 4 pages.
//
// Topic lists come from the simulator's real topics: without --topics, an old
// client first samples what the server sends for --sample-secs and writes it.

import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const BMS_PAGE = ['BMS/'];
const SMALL_PAGES = [
  ['VCU/Pedals/', 'VCU/CarState/'],
  ['DTI/General/', 'DTI/Temps/', 'DTI/Power/'],
  ['BMS/Segment_Volt/', 'BMS/Segment_Temp/', 'BMS/Status/', 'BMS/Charging/'],
  ['MSB/F/', 'MSB/B/'],
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const url = args.url ?? 'http://localhost:8121';
const warmup = Number(args.warmup ?? 5);
const secs = Number(args.secs ?? 30);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(kind, index, topics) {
  const opts = {
    transports: ['websocket'],
    reconnection: false,
    query: { clientId: `bench-${kind}-${index}-${process.pid}` },
  };
  if (kind === 'bms') opts.auth = { topics };
  return io(url, opts);
}

/** The topic list a client of this kind asks for, from the sampled topics. */
function topicsFor(kind, index, all) {
  const pick = (prefixes) => all.filter((t) => prefixes.some((p) => t.startsWith(p)));
  switch (kind) {
    case 'old':
      return null;
    case 'bms':
      return pick(BMS_PAGE);
    case 'small':
      return pick(SMALL_PAGES[index % SMALL_PAGES.length]);
    case 'empty':
      return [];
    default:
      throw new Error(`unknown client kind ${kind}`);
  }
}

// ---- child: one client ------------------------------------------------------

async function child() {
  const kind = args.kind;
  const index = Number(args.index);
  const all = Object.keys(JSON.parse(readFileSync(args['topics-json'], 'utf8')).counts);
  const wanted = topicsFor(kind, index, all);
  const wantedSet = wanted && new Set(wanted);
  const socket = connect(kind, index, wanted);

  let c = fresh();
  function fresh() {
    return { dataMsgs: 0, dataBytes: 0, otherMsgs: 0, totalBytes: 0, topics: new Set(), unwanted: 0 };
  }
  socket.io.on('open', () => {
    socket.io.engine.on('packet', (p) => {
      if (p.type !== 'message' || typeof p.data !== 'string') return;
      c.totalBytes += p.data.length;
      if (p.data.startsWith('2["data"')) c.dataBytes += p.data.length;
    });
  });
  socket.on('data', (payload) => {
    const msg = JSON.parse(payload);
    c.dataMsgs++;
    c.topics.add(msg.name);
    if (wantedSet && !wantedSet.has(msg.name)) c.unwanted++;
  });
  socket.onAny((event) => {
    if (event !== 'data') c.otherMsgs++;
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  let ackMs = null;
  let ackCount = null;
  if (kind === 'small' || kind === 'empty') {
    const start = performance.now();
    try {
      const ack = await socket.timeout(3000).emitWithAck('set_subscriptions', wanted);
      ackMs = performance.now() - start;
      ackCount = ack.count;
    } catch {
      // develop's server has no set_subscriptions handler, so never acks
      ackMs = 'none';
    }
  }

  await sleep(warmup * 1000);
  c = fresh();
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  await sleep(secs * 1000);
  const elapsed = (performance.now() - t0) / 1000;
  const cpu = process.cpuUsage(cpu0);
  socket.disconnect();
  process.stdout.write(
    JSON.stringify({
      kind,
      index,
      asked: wanted ? wanted.length : 'all',
      ackMs,
      ackCount,
      dataMsgsPerSec: c.dataMsgs / elapsed,
      dataBytesPerSec: c.dataBytes / elapsed,
      otherMsgsPerSec: c.otherMsgs / elapsed,
      totalBytesPerSec: c.totalBytes / elapsed,
      distinctTopics: c.topics.size,
      unwantedMsgs: c.unwanted,
      cpuPct: ((cpu.user + cpu.system) / 1e6 / elapsed) * 100,
    }) + '\n',
  );
  process.exit(0);
}

// ---- main -------------------------------------------------------------------

async function sample(sampleSecs, out) {
  console.log(`sampling topics with an old client for ${sampleSecs} s...`);
  const socket = connect('old', 0, null);
  const counts = {};
  socket.on('data', (payload) => {
    const { name } = JSON.parse(payload);
    counts[name] = (counts[name] ?? 0) + 1;
  });
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  await sleep(sampleSecs * 1000);
  socket.disconnect();
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ url, secs: sampleSecs, counts: sorted }, null, 1));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`  ${Object.keys(counts).length} topics, ${(total / sampleSecs).toFixed(0)} msgs/s -> ${out}`);
}

/** utime + stime of a process, in seconds. */
function procCpu(pid) {
  const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
  const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  return (Number(fields[11]) + Number(fields[12])) / CLK_TCK;
}
let CLK_TCK = 100;

function procRssMb(pid) {
  const m = readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/);
  return m ? Number(m[1]) / 1024 : null;
}

async function main() {
  try {
    CLK_TCK = Number(execSync('getconf CLK_TCK').toString().trim()) || 100;
  } catch {
    /* default */
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const topicsFile = args.topics ?? args['sample-out'] ?? `${here}/results/topics-sample.json`;
  if (!args.topics) await sample(Number(args['sample-secs'] ?? 10), topicsFile);
  if (args['sample-only']) return;

  const kinds = String(args.clients ?? 'old,bms,small,empty')
    .split(',')
    .flatMap((spec) => {
      const [kind, n] = spec.split('*');
      return Array.from({ length: Number(n ?? 1) }, () => kind);
    });
  const label = args.label ?? url;
  const serverPid = args['server-pid'] ? Number(args['server-pid']) : null;
  console.log(`${label}: ${kinds.length} clients [${kinds.join(', ')}], ${warmup} s warm-up, ${secs} s measured`);

  const perKind = {};
  const children = kinds.map((kind) => {
    const index = (perKind[kind] = (perKind[kind] ?? -1) + 1);
    const proc = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), '--child', '--url', url, '--kind', kind, '--index', String(index),
        '--topics-json', topicsFile, '--warmup', String(warmup), '--secs', String(secs)],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    let out = '';
    proc.stdout.on('data', (d) => (out += d));
    return new Promise((resolve, reject) =>
      proc.on('exit', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`${kind}#${index} exited ${code}`)))),
    );
  });

  // the children connect, ack and warm up in ~warmup s; measure the server over their window
  await sleep(warmup * 1000 + 500);
  const s0 = serverPid && procCpu(serverPid);
  const t0 = performance.now();
  await sleep(secs * 1000 - 1000);
  const server = serverPid && {
    cpuPct: ((procCpu(serverPid) - s0) / ((performance.now() - t0) / 1000)) * 100,
    rssMb: procRssMb(serverPid),
  };
  const results = await Promise.all(children);

  const pad = (v, n) => String(v).padStart(n);
  console.log('| client   | asked | ack ms | data msgs/s | data KB/s | other msgs/s | topics | unwanted | client CPU |');
  console.log('|----------|-------|--------|-------------|-----------|--------------|--------|----------|------------|');
  for (const r of results) {
    console.log(
      `| ${(r.kind + '#' + r.index).padEnd(8)} | ${pad(r.asked, 5)} | ${pad(typeof r.ackMs === 'number' ? r.ackMs.toFixed(1) : (r.ackMs ?? '-'), 6)} | ` +
        `${pad(r.dataMsgsPerSec.toFixed(0), 11)} | ${pad((r.dataBytesPerSec / 1024).toFixed(1), 9)} | ` +
        `${pad(r.otherMsgsPerSec.toFixed(1), 12)} | ${pad(r.distinctTopics, 6)} | ${pad(r.unwantedMsgs, 8)} | ${pad(r.cpuPct.toFixed(1) + ' %', 10)} |`,
    );
  }
  if (server) console.log(`server process: ${server.cpuPct.toFixed(1)} % CPU (of one core), ${server.rssMb?.toFixed(0)} MB RSS`);

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify({ label, url, warmup, secs, kinds, server, results }, null, 1));
  }
}

if (args.child) child().catch((e) => (console.error(e), process.exit(1)));
else main().catch((e) => (console.error(e), process.exit(1)));
