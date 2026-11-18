import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import { SHUTDOWN_TOPICS } from './shutdown-page.topics';
import { BoardLastSeen, computeLoopStatus, LoopStatus, NodeState, Reading } from './shutdown-loop.utils';

const NOW = 1_000_000;
const { VCU, BMS } = SHUTDOWN_TOPICS;
const MEASURED_TOPICS = SHUTDOWN_LOOP.filter((n) => n.topic).map((n) => n.topic!);

/** Readings with every measured topic = 1, both boards seen at NOW. */
const allClosed = (): { readings: Map<string, Reading>; seen: BoardLastSeen } => ({
  readings: new Map(MEASURED_TOPICS.map((t) => [t, { value: 1, receivedAt: NOW, changedAt: NOW - 10_000 }])),
  seen: { VCU: NOW, BMS: NOW }
});

/** Sets `topic` and every measured topic after it in loop order to 0. */
const openFrom = (readings: Map<string, Reading>, topic: string): void => {
  const start = MEASURED_TOPICS.indexOf(topic);
  for (const t of MEASURED_TOPICS.slice(start)) readings.set(t, { value: 0, receivedAt: NOW, changedAt: NOW - 10_000 });
};

const run = (readings: Map<string, Reading>, seen: BoardLastSeen, now = NOW): LoopStatus =>
  computeLoopStatus(SHUTDOWN_LOOP, readings, seen, now);

const stateOf = (status: LoopStatus, id: string): NodeState => status.nodes.find((n) => n.node.id === id)!.state;
const suspectIds = (status: LoopStatus): string[] => status.suspects.map((n) => n.id);

describe('computeLoopStatus', () => {
  it('closed when all live and 1', () => {
    const { readings, seen } = allClosed();
    const status = run(readings, seen);
    expect(status.verdict).toBe('closed');
    expect(status.airsEnergized).toBeTrue();
    expect(status.nodes.every((n) => n.state === 'closed')).toBeTrue();
  });

  it('unknown when no readings', () => {
    const status = run(new Map(), {});
    expect(status.verdict).toBe('unknown');
    expect(status.silentBoards).toEqual(['VCU', 'BMS']);
    expect(status.nodes.filter((n) => n.state === 'no-data').length).toBe(13);
    expect(status.airsEnergized).toBeFalse();
  });

  it('unknown when BMS stale', () => {
    const { readings } = allClosed();
    const status = run(readings, { VCU: NOW, BMS: NOW - 60_001 });
    expect(status.verdict).toBe('unknown');
    expect(status.silentBoards).toEqual(['BMS']);
    for (const id of ['acc-sense', 'tsip-sense', 'ts-minus', 'ts-plus']) expect(stateOf(status, id)).toBe('no-data');
    expect(stateOf(status, 'tsms')).toBe('closed');
  });

  it('not stale at exactly 60s', () => {
    const { readings } = allClosed();
    expect(run(readings, { VCU: NOW, BMS: NOW - 60_000 }).verdict).toBe('closed');
  });

  it('single culprit', () => {
    const { readings, seen } = allClosed();
    openFrom(readings, VCU.TSMS);
    const status = run(readings, seen);
    expect(status.verdict).toBe('open');
    expect(suspectIds(status)).toEqual(['tsms']);
    for (const id of ['hvd', 'em-interlock', 'acc-sense', 'tsip-sense', 'ts-minus', 'ts-plus', 'airs']) {
      expect(stateOf(status, id)).withContext(id).toBe('downstream-open');
    }
    expect(stateOf(status, 'cockpit-brb')).toBe('closed');
  });

  it('unmeasured stretch is suspect', () => {
    const { readings, seen } = allClosed();
    openFrom(readings, VCU.BMS);
    const status = run(readings, seen);
    expect(suspectIds(status)).toEqual(['side-brb-r', 'side-brb-l', 'bms-latch']);
    expect(stateOf(status, 'glvms')).toBe('closed');
    expect(stateOf(status, 'vcu')).toBe('closed');
  });

  it('em placeholder suspect', () => {
    const { readings, seen } = allClosed();
    openFrom(readings, BMS.Acc);
    expect(suspectIds(run(readings, seen))).toEqual(['em-interlock', 'acc-sense']);
  });

  it('em placeholder closed when loop closed', () => {
    const { readings, seen } = allClosed();
    expect(stateOf(run(readings, seen), 'em-interlock')).toBe('closed');
  });

  it('em placeholder downstream when break upstream', () => {
    const { readings, seen } = allClosed();
    openFrom(readings, VCU.TSMS);
    expect(stateOf(run(readings, seen), 'em-interlock')).toBe('downstream-open');
  });

  it('stale node widens suspect stretch', () => {
    const { readings, seen } = allClosed();
    openFrom(readings, BMS.Acc);
    readings.delete(VCU.HVD);
    const status = run(readings, seen);
    expect(stateOf(status, 'hvd')).toBe('no-data');
    expect(stateOf(status, 'tsms')).toBe('closed');
    expect(suspectIds(status)).toEqual(['em-interlock', 'acc-sense']);
  });

  it('mismatch after grace', () => {
    const { readings, seen } = allClosed();
    readings.set(VCU.BOTS, { value: 0, receivedAt: NOW, changedAt: NOW - 1000 });
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW - 1000 });
    const status = run(readings, seen);
    const tsms = status.nodes.find((n) => n.node.id === 'tsms')!;
    expect(tsms.mismatch).toBeTrue();
    expect(tsms.state).toBe('downstream-open');
    expect(status.mismatch).toBeTrue();
    expect(status.verdict).toBe('open');
  });

  it('no mismatch within grace', () => {
    const { readings, seen } = allClosed();
    readings.set(VCU.BOTS, { value: 0, receivedAt: NOW, changedAt: NOW - 499 });
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW - 1000 });
    const status = run(readings, seen);
    expect(status.nodes.find((n) => n.node.id === 'tsms')!.mismatch).toBeFalse();
    expect(status.mismatch).toBeFalse();
  });

  it('non-zero counts as closed', () => {
    const { readings, seen } = allClosed();
    for (const t of MEASURED_TOPICS) readings.set(t, { value: 2, receivedAt: NOW, changedAt: NOW });
    expect(run(readings, seen).verdict).toBe('closed');
  });

  it('reports value and age for measured nodes', () => {
    const { readings, seen } = allClosed();
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW - 3000, changedAt: NOW - 3000 });
    const tsms = run(readings, seen).nodes.find((n) => n.node.id === 'tsms')!;
    expect(tsms.value).toBe(1);
    expect(tsms.ageMs).toBe(3000);
    expect(run(readings, seen).nodes.find((n) => n.node.id === 'glvms')!.value).toBeUndefined();
  });
});
