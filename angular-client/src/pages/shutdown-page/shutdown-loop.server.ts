import { LoopStatus, NodeState, NodeStatus, summarizeLoop } from './shutdown-loop.utils';

/**
 * Codes scylla-server publishes per loop node, in SHUTDOWN_LOOP order, on
 * `Argos/Shutdown/NodeStates` (ADR 0009). `mismatch` is a downstream-open node that reads closed.
 * Keep in step with `NodeState::code` in scylla-server/src/shutdown_loop/status.rs.
 */
export const NODE_STATE_CODE = {
  closed: 0,
  suspect: 1,
  'downstream-open': 2,
  'no-data': 3,
  mismatch: 4
} as const;

/** scylla-server publishes its node states every second and on every change. */
export const SERVER_FRESH_MS = 3_000;

export interface ServerNodeStates {
  codes: number[];
  /** When this client received them (ms since epoch). */
  receivedAt: number;
}

const DECODE: Record<number, { state: NodeState; mismatch: boolean }> = {
  [NODE_STATE_CODE.closed]: { state: 'closed', mismatch: false },
  [NODE_STATE_CODE.suspect]: { state: 'suspect', mismatch: false },
  [NODE_STATE_CODE['downstream-open']]: { state: 'downstream-open', mismatch: false },
  [NODE_STATE_CODE['no-data']]: { state: 'no-data', mismatch: false },
  [NODE_STATE_CODE.mismatch]: { state: 'downstream-open', mismatch: true }
};

/** The node-state codes in a datapoint's values, or undefined if any is blank or not a number. */
export function parseServerNodeStates(values: readonly string[], receivedAt: number): ServerNodeStates | undefined {
  if (!values.length) return undefined;
  const codes = values.map((v) => (String(v).trim() === '' ? NaN : Number(v)));
  return codes.every(Number.isFinite) ? { codes, receivedAt } : undefined;
}

/**
 * The status to show: scylla-server's node states while they are fresh and fit this client's loop
 * (it sees every message, while a client may have some discarded), otherwise the local one. Node
 * values and ages always come from the local readings.
 */
export function resolveLoopStatus(local: LoopStatus, server: ServerNodeStates | undefined, now: number): LoopStatus {
  if (!server || now - server.receivedAt > SERVER_FRESH_MS || server.codes.length !== local.nodes.length) {
    return { ...local, source: 'local' };
  }
  const decoded = server.codes.map((code) => DECODE[code]);
  if (decoded.some((d) => d === undefined)) return { ...local, source: 'local' };
  const nodes: NodeStatus[] = local.nodes.map((s, i) => ({ ...s, ...decoded[i] }));
  return { ...summarizeLoop(nodes), source: 'server' };
}
