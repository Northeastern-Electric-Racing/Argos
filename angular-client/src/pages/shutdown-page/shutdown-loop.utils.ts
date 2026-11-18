import { Board, LoopNode } from './shutdown-loop.model';

/** Latest value of one topic. Times are ms since epoch. */
export interface Reading {
  value: number;
  receivedAt: number;
  /** When `value` last changed (not merely re-sent). */
  changedAt: number;
}
export type Readings = ReadonlyMap<string, Reading>;
/** Time of the last message received from each board. */
export type BoardLastSeen = Partial<Record<Board, number>>;

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
}

export const STALE_AFTER_MS = 60_000;
export const MISMATCH_GRACE_MS = 500;

/**
 * Works out where the series shutdown loop is broken. Each reading is the loop voltage just after
 * its node, so the first live reading of 0 marks the break; every node between the previous live
 * reading and that one is a suspect, and everything after it is open only because of the break.
 */
export function computeLoopStatus(
  nodes: readonly LoopNode[],
  readings: Readings,
  boardLastSeen: BoardLastSeen,
  now: number
): LoopStatus {
  const boardLive = (board: Board): boolean => {
    const seen = boardLastSeen[board];
    return seen !== undefined && now - seen <= STALE_AFTER_MS;
  };
  const liveReading = (node: LoopNode): Reading | undefined => {
    if (!node.topic || !node.board || !boardLive(node.board)) return undefined;
    return readings.get(node.topic);
  };
  const live = nodes.map(liveReading);

  const breakIdx = live.findIndex((r) => r !== undefined && r.value === 0);
  // With no reading before the break, the loop is still known good up to its source while the VCU
  // (which sources the loop) is publishing: that means GLV is on and the VCU is up. If the VCU is
  // silent, it and everything before it are suspects too.
  let lastClosedIdx = boardLive('VCU') ? nodes.findIndex((n) => n.kind === 'source') : -1;
  if (breakIdx >= 0) {
    for (let i = breakIdx - 1; i >= 0; i--) {
      if (live[i] !== undefined) {
        lastClosedIdx = i;
        break;
      }
    }
  }
  const breakReading = breakIdx >= 0 ? live[breakIdx] : undefined;
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
    const mismatch =
      r !== undefined && r.value !== 0 && now - Math.max(breakReading.changedAt, r.changedAt) >= MISMATCH_GRACE_MS;
    return { ...base, state: 'downstream-open', mismatch };
  });

  const silentBoards: Board[] = [];
  for (const s of statuses) {
    const { board } = s.node;
    if (s.state === 'no-data' && board && !silentBoards.includes(board)) silentBoards.push(board);
  }

  const verdict = breakReading ? 'open' : silentBoards.length ? 'unknown' : 'closed';
  return {
    verdict,
    nodes: statuses,
    suspects: statuses.filter((s) => s.state === 'suspect').map((s) => s.node),
    noDataInStretch: breakReading
      ? statuses.filter((s, i) => s.state === 'no-data' && i > lastClosedIdx && i < breakIdx).map((s) => s.node)
      : [],
    silentBoards,
    mismatch: statuses.some((s) => s.mismatch),
    airsEnergized: verdict === 'closed'
  };
}
