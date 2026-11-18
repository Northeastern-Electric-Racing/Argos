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
  const liveReading = (node: LoopNode): Reading | undefined => {
    if (!node.topic || !node.board) return undefined;
    const seen = boardLastSeen[node.board];
    if (seen === undefined || now - seen > STALE_AFTER_MS) return undefined;
    return readings.get(node.topic);
  };
  const live = nodes.map(liveReading);

  const breakIdx = live.findIndex((r) => r !== undefined && r.value === 0);
  // With no reading before the break, the loop is still known good up to its source: a live reading
  // means GLV is on and the VCU is up and feeding the loop.
  let lastClosedIdx = nodes.findIndex((n) => n.kind === 'source');
  if (breakIdx >= 0) {
    for (let i = breakIdx - 1; i >= 0; i--) {
      if (live[i] !== undefined) {
        lastClosedIdx = i;
        break;
      }
    }
  }
  const breakReading = breakIdx >= 0 ? live[breakIdx] : undefined;

  const statuses: NodeStatus[] = nodes.map((node, i) => {
    const reading = node.topic ? readings.get(node.topic) : undefined;
    const base = {
      node,
      value: reading?.value,
      ageMs: reading ? now - reading.receivedAt : undefined,
      mismatch: false
    };
    if (node.topic && live[i] === undefined) return { ...base, state: 'no-data' };
    if (!breakReading || i <= lastClosedIdx) return { ...base, state: 'closed' };
    if (i <= breakIdx) return { ...base, state: 'suspect' };
    const r = live[i];
    const mismatch =
      r !== undefined && r.value !== 0 && now - Math.max(breakReading.changedAt, r.changedAt) >= MISMATCH_GRACE_MS;
    return { ...base, state: 'downstream-open', mismatch };
  });

  const silentBoards: Board[] = [];
  for (const s of statuses) {
    const board = s.node.board;
    if (s.state === 'no-data' && board && !silentBoards.includes(board)) silentBoards.push(board);
  }

  const verdict = breakReading ? 'open' : silentBoards.length ? 'unknown' : 'closed';
  return {
    verdict,
    nodes: statuses,
    suspects: statuses.filter((s) => s.state === 'suspect').map((s) => s.node),
    silentBoards,
    mismatch: statuses.some((s) => s.mismatch),
    airsEnergized: verdict === 'closed'
  };
}
