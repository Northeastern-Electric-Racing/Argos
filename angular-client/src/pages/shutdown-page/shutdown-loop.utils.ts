import { Board, LoopNode } from './shutdown-loop.model';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';

/** Latest value of one topic. Times are ms since epoch, taken when the client received the message. */
export interface Reading {
  value: number;
  receivedAt: number;
  /** When `value` last changed (not merely re-sent), or when it arrived after the reading went stale. */
  changedAt: number;
  /** Smoothed time between messages on this topic; absent until a second message arrives. */
  intervalMs?: number;
}
export type Readings = ReadonlyMap<string, Reading>;

export type NodeState = 'closed' | 'suspect' | 'downstream-open' | 'no-data';
export interface NodeStatus {
  node: LoopNode;
  state: NodeState;
  /** Set only for measured nodes with a reading. */
  value?: number;
  /** now - receivedAt; set only for measured nodes with a reading. */
  ageMs?: number;
  /** Reads closed after the break, persisting past MISMATCH_GRACE_MS. */
  mismatch: boolean;
}
export type Verdict = 'open' | 'closed' | 'unknown';
export interface LoopStatus {
  verdict: Verdict;
  nodes: NodeStatus[];
  suspects: LoopNode[];
  /** Measured nodes with no data that sit inside the suspect stretch: they could be the cause too. */
  noDataInStretch: LoopNode[];
  silentBoards: Board[];
  mismatch: boolean;
  airsEnergized: boolean;
  /** Who worked out the node states: this client, or scylla-server (see shutdown-loop.server.ts). */
  source?: 'local' | 'server';
}

/** Timeout before a topic's message rate is known, and the most any timeout can grow to. */
export const STALE_AFTER_MS = 60_000;
/** The least a timeout can shrink to, so trackside Wi-Fi hiccups don't blank the page. */
export const MIN_STALE_AFTER_MS = 3_000;
/** A reading is stale after this many message intervals with nothing new. */
export const STALE_INTERVAL_MULTIPLE = 5;
/** Weight of the newest gap in the smoothed message interval. */
export const INTERVAL_SMOOTHING = 0.25;
export const MISMATCH_GRACE_MS = 500;

/** How long `reading` stays live without a new message: a few message intervals, clamped. */
export function staleAfterMs(reading: Reading): number {
  if (reading.intervalMs === undefined) return STALE_AFTER_MS;
  const timeout = reading.intervalMs * STALE_INTERVAL_MULTIPLE;
  return Math.min(STALE_AFTER_MS, Math.max(MIN_STALE_AFTER_MS, timeout));
}

export function isLive(reading: Reading | undefined, now: number): reading is Reading {
  return reading !== undefined && now - reading.receivedAt <= staleAfterMs(reading);
}

/**
 * The reading after a message with `value` arrives at `now`. A message after the reading went stale
 * starts afresh: nothing is known about the gap, so neither its change time nor its rate carry over
 * (the rate is relearnt from the next message, which also copes with a publisher that slowed down).
 */
export function nextReading(prev: Reading | undefined, value: number, now: number): Reading {
  if (!prev || !isLive(prev, now)) return { value, receivedAt: now, changedAt: now };
  const gap = now - prev.receivedAt;
  const intervalMs = prev.intervalMs === undefined ? gap : prev.intervalMs + INTERVAL_SMOOTHING * (gap - prev.intervalMs);
  return { value, receivedAt: now, changedAt: prev.value === value ? prev.changedAt : now, intervalMs };
}

/**
 * The CAN latch reading, derived from the VCU's critical faults (CAN 0x502): open (0) while any live
 * fault is tripped, closed (1) only while every one is live and clear, and no reading otherwise.
 * Stale faults count as unknown, never as tripped or clear.
 */
export function deriveCanLatch(
  readings: Readings,
  now: number,
  faultTopics: readonly string[] = VCU_CRITICAL_FAULT_TOPICS
): Reading | undefined {
  const faults = faultTopics.map((t) => readings.get(t));
  const live = faults.filter((r): r is Reading => isLive(r, now));
  const tripped = live.filter((r) => r.value !== 0);
  if (tripped.length) {
    // Open since the earliest fault that is still tripped; as fresh as the latest confirmation.
    const latest = tripped.reduce((a, b) => (b.receivedAt > a.receivedAt ? b : a));
    const changedAt = Math.min(...tripped.map((r) => r.changedAt));
    return { value: 0, receivedAt: latest.receivedAt, changedAt, intervalMs: latest.intervalMs };
  }
  if (!live.length || live.length !== faults.length) return undefined;
  // Closed since the last fault cleared; only as fresh as the oldest fault.
  const oldest = live.reduce((a, b) => (b.receivedAt < a.receivedAt ? b : a));
  const changedAt = Math.max(...live.map((r) => r.changedAt));
  return { value: 1, receivedAt: oldest.receivedAt, changedAt, intervalMs: oldest.intervalMs };
}

/** `readings` plus the readings the page derives rather than receives (the CAN latch). */
export function withDerivedReadings(readings: Readings, now: number): Readings {
  const derived = new Map(readings);
  const canLatch = deriveCanLatch(readings, now);
  if (canLatch) derived.set(SHUTDOWN_TOPICS.VCU.CAN_LATCH, canLatch);
  else derived.delete(SHUTDOWN_TOPICS.VCU.CAN_LATCH);
  return derived;
}

/**
 * Works out where the series shutdown loop is broken. Each reading is the loop voltage just after
 * its node, so the first live reading of 0 marks the break; every node between the previous live
 * reading and that one is a suspect, and everything after it is open only because of the break.
 */
export function computeLoopStatus(nodes: readonly LoopNode[], readings: Readings, now: number): LoopStatus {
  const live = nodes.map((node) => {
    if (!node.topic || !node.board) return undefined;
    const reading = readings.get(node.topic);
    return isLive(reading, now) ? reading : undefined;
  });
  const boardLive = (board: Board): boolean => nodes.some((n, i) => n.board === board && live[i] !== undefined);

  const breakIdx = live.findIndex((r) => r !== undefined && r.value === 0);
  // With no reading before the break, the first node (GLV master switch) is still known closed while
  // the VCU is publishing: that means GLV is on. If the VCU is silent, it is a suspect too.
  let lastClosedIdx = boardLive('VCU') ? 0 : -1;
  if (breakIdx >= 0) {
    for (let i = breakIdx - 1; i >= 0; i--) {
      if (live[i] !== undefined) {
        lastClosedIdx = i;
        break;
      }
    }
  }
  const breakReading = breakIdx >= 0 ? live[breakIdx] : undefined;
  const breakBoard = breakIdx >= 0 ? nodes[breakIdx].board : undefined;
  // Without a break, an unmeasured node is only known closed if a live reading after it shows
  // voltage, or if every reading is live (which covers the AIRs at the very end).
  const allLive = nodes.every((n, i) => !n.topic || live[i] !== undefined);
  let lastLiveIdx = -1;
  live.forEach((r, i) => {
    if (r !== undefined) lastLiveIdx = i;
  });

  const statuses: NodeStatus[] = nodes.map((node, i) => {
    const reading = node.topic ? readings.get(node.topic) : undefined;
    const base = {
      node,
      value: reading?.value,
      ageMs: reading ? now - reading.receivedAt : undefined,
      mismatch: false
    };
    if (node.topic && live[i] === undefined) return { ...base, state: 'no-data' };
    if (!breakReading && !node.topic && !allLive && i > lastLiveIdx) return { ...base, state: 'no-data' };
    if (!breakReading || i <= lastClosedIdx) return { ...base, state: 'closed' };
    if (i <= breakIdx) return { ...base, state: 'suspect' };
    const r = live[i];
    const mismatch = r !== undefined && isMismatch(r, breakReading, node.board === breakBoard, now);
    return { ...base, state: 'downstream-open', mismatch };
  });

  return { ...summarizeLoop(statuses), source: 'local' };
}

/**
 * A downstream reading of closed contradicts the break once both values have held for the grace
 * window. A reading from another board must also have been received at least the grace window after
 * the break appeared: the boards sample independently, so until the other board sends a fresh
 * sample its last one may predate the break.
 */
function isMismatch(reading: Reading, breakReading: Reading, sameBoard: boolean, now: number): boolean {
  if (reading.value === 0) return false;
  const sampledAfterBreak = sameBoard || reading.receivedAt - breakReading.changedAt >= MISMATCH_GRACE_MS;
  return sampledAfterBreak && now - Math.max(breakReading.changedAt, reading.changedAt) >= MISMATCH_GRACE_MS;
}

/** The loop-wide summary of per-node statuses, however they were worked out. */
export function summarizeLoop(statuses: NodeStatus[]): Omit<LoopStatus, 'source'> {
  const silentBoards: Board[] = [];
  for (const s of statuses) {
    const { board } = s.node;
    if (s.state === 'no-data' && board && !silentBoards.includes(board)) silentBoards.push(board);
  }
  const suspects = statuses.filter((s) => s.state === 'suspect').map((s) => s.node);
  const breakIdx = statuses.map((s) => s.state).lastIndexOf('suspect');
  let lastClosedIdx = -1;
  for (let i = breakIdx - 1; i >= 0; i--) {
    if (statuses[i].state === 'closed') {
      lastClosedIdx = i;
      break;
    }
  }
  const verdict: Verdict = suspects.length ? 'open' : silentBoards.length ? 'unknown' : 'closed';
  return {
    verdict,
    nodes: statuses,
    suspects,
    noDataInStretch:
      breakIdx >= 0
        ? statuses.filter((s, i) => s.state === 'no-data' && i > lastClosedIdx && i < breakIdx).map((s) => s.node)
        : [],
    silentBoards,
    mismatch: statuses.some((s) => s.mismatch),
    airsEnergized: verdict === 'closed'
  };
}
