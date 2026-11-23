import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { NODE_STATE_CODE, parseServerNodeStates, resolveLoopStatus, SERVER_FRESH_MS } from './shutdown-loop.server';
import { computeLoopStatus, LoopStatus, Reading } from './shutdown-loop.utils';

const NOW = 1_000_000;
const MEASURED_TOPICS = SHUTDOWN_LOOP.filter((n) => n.topic).map((n) => n.topic!);
const localClosed = (): LoopStatus =>
  computeLoopStatus(
    SHUTDOWN_LOOP,
    new Map<string, Reading>(MEASURED_TOPICS.map((t) => [t, { value: 1, receivedAt: NOW, changedAt: NOW }])),
    NOW
  );
const idx = (id: string) => SHUTDOWN_LOOP.findIndex((n) => n.id === id);

/** Server codes for a break at `id` (single culprit), closed before and downstream-open after. */
const breakAt = (id: string): number[] =>
  SHUTDOWN_LOOP.map((_, i) =>
    i < idx(id) ? NODE_STATE_CODE.closed : i === idx(id) ? NODE_STATE_CODE.suspect : NODE_STATE_CODE['downstream-open']
  );

describe('resolveLoopStatus', () => {
  it('uses the local status when there is no server status', () => {
    const status = resolveLoopStatus(localClosed(), undefined, NOW);
    expect(status.source).toBe('local');
    expect(status.verdict).toBe('closed');
  });

  it('prefers fresh server node states, keeping local values and ages', () => {
    const status = resolveLoopStatus(localClosed(), { codes: breakAt('tsms'), receivedAt: NOW - 500 }, NOW);
    expect(status.source).toBe('server');
    expect(status.verdict).toBe('open');
    expect(status.suspects.map((n) => n.id)).toEqual(['tsms']);
    expect(status.airsEnergized).toBe(false);
    const tsms = status.nodes[idx('tsms')];
    expect(tsms.value).toBe(1);
    expect(tsms.ageMs).toBe(0);
  });

  it('falls back to local once the server status is stale', () => {
    const status = resolveLoopStatus(localClosed(), { codes: breakAt('tsms'), receivedAt: NOW - SERVER_FRESH_MS - 1 }, NOW);
    expect(status.source).toBe('local');
    expect(status.verdict).toBe('closed');
  });

  it('falls back to local when the server loop does not match this client', () => {
    const local = localClosed();
    expect(resolveLoopStatus(local, { codes: breakAt('tsms').slice(1), receivedAt: NOW }, NOW).source).toBe('local');
    const bad = breakAt('tsms');
    bad[3] = 9;
    expect(resolveLoopStatus(local, { codes: bad, receivedAt: NOW }, NOW).source).toBe('local');
  });

  it('reads server mismatch, unknown and no-data-in-stretch like the local summary', () => {
    const codes = breakAt('acc-sense');
    codes[idx('em-interlock')] = NODE_STATE_CODE.suspect;
    codes[idx('hvd')] = NODE_STATE_CODE['no-data'];
    codes[idx('ts-plus')] = NODE_STATE_CODE.mismatch;
    const status = resolveLoopStatus(localClosed(), { codes, receivedAt: NOW }, NOW);
    expect(status.suspects.map((n) => n.id)).toEqual(['em-interlock', 'acc-sense']);
    expect(status.noDataInStretch.map((n) => n.id)).toEqual(['hvd']);
    expect(status.mismatch).toBe(true);
    expect(status.nodes[idx('ts-plus')]).toMatchObject({ state: 'downstream-open', mismatch: true });

    const unknown = SHUTDOWN_LOOP.map((n) => (n.board === 'BMS' ? NODE_STATE_CODE['no-data'] : NODE_STATE_CODE.closed));
    const u = resolveLoopStatus(localClosed(), { codes: unknown, receivedAt: NOW }, NOW);
    expect(u.verdict).toBe('unknown');
    expect(u.silentBoards).toEqual(['BMS']);
  });
});

describe('parseServerNodeStates', () => {
  it('parses numeric codes', () => {
    expect(parseServerNodeStates(['0', '1', '2'], NOW)).toEqual({ codes: [0, 1, 2], receivedAt: NOW });
  });

  it('rejects blanks and non-numbers', () => {
    expect(parseServerNodeStates(['0', ''], NOW)).toBeUndefined();
    expect(parseServerNodeStates(['0', 'x'], NOW)).toBeUndefined();
    expect(parseServerNodeStates([], NOW)).toBeUndefined();
  });
});
