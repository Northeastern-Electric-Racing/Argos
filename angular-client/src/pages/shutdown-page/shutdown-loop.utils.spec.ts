import { Board, SHUTDOWN_LOOP } from './shutdown-loop.model';
import { SHUTDOWN_TOPICS, VCU_CRITICAL_FAULT_TOPICS } from './shutdown-page.topics';
import {
  computeLoopStatus,
  deriveCanLatch,
  isLive,
  LoopStatus,
  MIN_STALE_AFTER_MS,
  nextReading,
  NodeState,
  Reading,
  STALE_AFTER_MS,
  staleAfterMs,
  withDerivedReadings
} from './shutdown-loop.utils';

const NOW = 1_000_000;
const { VCU, BMS } = SHUTDOWN_TOPICS;
/** Loop nodes with a topic the car publishes (the CAN latch is derived from the critical faults). */
const MEASURED = SHUTDOWN_LOOP.filter((n) => n.topic && !n.openOnly);
const MEASURED_TOPICS = MEASURED.map((n) => n.topic!);
const topicsOf = (board: Board): string[] => MEASURED.filter((n) => n.board === board).map((n) => n.topic!);

/** Sets every critical VCU fault to `value` (0 = clear). */
const setFaults = (readings: Map<string, Reading>, value: number, reading: Partial<Reading> = {}): void => {
  for (const t of VCU_CRITICAL_FAULT_TOPICS) {
    readings.set(t, { value, receivedAt: NOW, changedAt: NOW - 10_000, ...reading });
  }
};

/** Readings with every published sense topic = 1 and every critical fault clear, all received at NOW. */
const allClosed = (): Map<string, Reading> => {
  const readings = new Map(MEASURED_TOPICS.map((t) => [t, { value: 1, receivedAt: NOW, changedAt: NOW - 10_000 }]));
  setFaults(readings, 0);
  return readings;
};

/** Sets `topic` and every published sense topic after it in loop order to 0. */
const openFrom = (readings: Map<string, Reading>, topic: string): void => {
  const start = MEASURED_TOPICS.indexOf(topic);
  for (const t of MEASURED_TOPICS.slice(start)) readings.set(t, { value: 0, receivedAt: NOW, changedAt: NOW - 10_000 });
};

/** Removes every reading published by `board` (for the VCU, both frames), as if it had never been heard from. */
const silence = (readings: Map<string, Reading>, board: Board): void => {
  topicsOf(board).forEach((t) => readings.delete(t));
  if (board === 'VCU') VCU_CRITICAL_FAULT_TOPICS.forEach((t) => readings.delete(t));
};

/** Moves every reading from `board` back in time by `ms`. */
const age = (readings: Map<string, Reading>, board: Board, ms: number): void => {
  for (const t of topicsOf(board)) {
    const r = readings.get(t);
    if (r) readings.set(t, { ...r, receivedAt: r.receivedAt - ms });
  }
};

/** The status the page computes: the CAN latch is derived from the fault readings first. */
const run = (readings: Map<string, Reading>, now = NOW): LoopStatus =>
  computeLoopStatus(SHUTDOWN_LOOP, withDerivedReadings(readings, now), now);

const nodeOf = (status: LoopStatus, id: string) => status.nodes.find((n) => n.node.id === id)!;
const stateOf = (status: LoopStatus, id: string): NodeState => nodeOf(status, id).state;
const suspectIds = (status: LoopStatus): string[] => status.suspects.map((n) => n.id);
const mismatchOf = (status: LoopStatus, id: string): boolean => nodeOf(status, id).mismatch;

describe('computeLoopStatus', () => {
  it('closed when all live and 1', () => {
    const status = run(allClosed());
    expect(status.verdict).toBe('closed');
    expect(status.airsEnergized).toBe(true);
    expect(status.nodes.every((n) => n.state === 'closed')).toBe(true);
  });

  it('unknown when no readings', () => {
    const status = run(new Map());
    expect(status.verdict).toBe('unknown');
    expect(status.silentBoards).toEqual(['VCU', 'BMS']);
    expect(status.nodes.every((n) => n.state === 'no-data')).toBe(true);
    expect(status.airsEnergized).toBe(false);
  });

  it('unknown when BMS stale', () => {
    const readings = allClosed();
    age(readings, 'BMS', 60_001);
    const status = run(readings);
    expect(status.verdict).toBe('unknown');
    expect(status.silentBoards).toEqual(['BMS']);
    for (const id of ['acc-sense', 'tsip-sense', 'ts-minus', 'ts-plus']) expect(stateOf(status, id)).toBe('no-data');
    expect(stateOf(status, 'tsms')).toBe('closed');
  });

  it('unmeasured nodes are no data when no live reading after them proves them closed', () => {
    expect(stateOf(run(new Map()), 'glvms')).toBe('no-data');
    expect(stateOf(run(new Map()), 'side-brb-r')).toBe('no-data');
    const readings = allClosed();
    silence(readings, 'BMS');
    const bmsSilent = run(readings);
    expect(stateOf(bmsSilent, 'glvms')).toBe('closed');
    expect(stateOf(bmsSilent, 'em-interlock')).toBe('no-data');
    expect(stateOf(bmsSilent, 'airs')).toBe('no-data');
  });

  it('not stale at exactly 60s before the message rate is known', () => {
    const readings = allClosed();
    age(readings, 'BMS', 60_000);
    expect(run(readings).verdict).toBe('closed');
  });

  it('single culprit', () => {
    const readings = allClosed();
    openFrom(readings, VCU.TSMS);
    const status = run(readings);
    expect(status.verdict).toBe('open');
    expect(suspectIds(status)).toEqual(['tsms']);
    for (const id of ['hvd', 'em-interlock', 'acc-sense', 'tsip-sense', 'ts-minus', 'ts-plus', 'airs']) {
      expect(stateOf(status, id), id).toBe('downstream-open');
    }
    expect(stateOf(status, 'cockpit-brb')).toBe('closed');
  });

  it('unmeasured stretch is suspect', () => {
    const readings = allClosed();
    openFrom(readings, VCU.BMS);
    const status = run(readings);
    expect(suspectIds(status)).toEqual(['side-brb-r', 'side-brb-l', 'bms-latch']);
    expect(stateOf(status, 'glvms')).toBe('closed');
  });

  it('em placeholder suspect', () => {
    const readings = allClosed();
    openFrom(readings, BMS.Acc);
    expect(suspectIds(run(readings))).toEqual(['em-interlock', 'acc-sense']);
  });

  it('em placeholder closed when loop closed', () => {
    expect(stateOf(run(allClosed()), 'em-interlock')).toBe('closed');
  });

  it('em placeholder downstream when break upstream', () => {
    const readings = allClosed();
    openFrom(readings, VCU.TSMS);
    expect(stateOf(run(readings), 'em-interlock')).toBe('downstream-open');
  });

  it('stale node widens suspect stretch', () => {
    const readings = allClosed();
    openFrom(readings, BMS.Acc);
    readings.delete(VCU.HVD);
    const status = run(readings);
    expect(stateOf(status, 'hvd')).toBe('no-data');
    expect(stateOf(status, 'tsms')).toBe('closed');
    expect(suspectIds(status)).toEqual(['em-interlock', 'acc-sense']);
  });

  it('lists no-data nodes inside the suspect stretch', () => {
    const readings = allClosed();
    openFrom(readings, BMS.Acc);
    readings.delete(VCU.HVD);
    expect(run(readings).noDataInStretch.map((n) => n.id)).toEqual(['hvd']);
  });

  it('blames from the loop start when the VCU is silent', () => {
    const readings = allClosed();
    openFrom(readings, BMS.Acc);
    silence(readings, 'VCU');
    const status = run(readings);
    // With no reading at all, the CAN latch is an unmeasured node inside the stretch.
    expect(suspectIds(status)).toEqual(['glvms', 'side-brb-r', 'side-brb-l', 'can-latch', 'em-interlock', 'acc-sense']);
    expect(status.noDataInStretch.map((n) => n.id)).toContain('tsms');
  });

  it('mismatch after grace', () => {
    const readings = allClosed();
    readings.set(VCU.BOTS, { value: 0, receivedAt: NOW, changedAt: NOW - 1000 });
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW - 1000 });
    const status = run(readings);
    const tsms = status.nodes.find((n) => n.node.id === 'tsms')!;
    expect(tsms.mismatch).toBe(true);
    expect(tsms.state).toBe('downstream-open');
    expect(status.mismatch).toBe(true);
    expect(status.verdict).toBe('open');
  });

  it('no mismatch within grace', () => {
    const readings = allClosed();
    readings.set(VCU.BOTS, { value: 0, receivedAt: NOW, changedAt: NOW - 499 });
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW - 1000 });
    const status = run(readings);
    expect(mismatchOf(status, 'tsms')).toBe(false);
    expect(status.mismatch).toBe(false);
  });

  it('no mismatch within grace of the downstream reading flipping back to closed', () => {
    const readings = allClosed();
    readings.set(VCU.BOTS, { value: 0, receivedAt: NOW, changedAt: NOW - 5000 });
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW - 200 });
    expect(mismatchOf(run(readings), 'tsms')).toBe(false);
  });

  // Bug: a slow board's last sample, taken before the break, was flagged as contradicting it as soon
  // as the grace window passed, though the board had not sampled since.
  it('no cross-board mismatch until the downstream board has sampled since the break', () => {
    const readings = allClosed();
    openFrom(readings, VCU.TSMS);
    for (const t of topicsOf('VCU').slice(topicsOf('VCU').indexOf(VCU.TSMS))) {
      readings.set(t, { value: 0, receivedAt: NOW, changedAt: NOW - 1000 });
    }
    // BMS publishes every 2 s; its last sample (closed) arrived before the VCU saw the break.
    for (const t of topicsOf('BMS'))
      readings.set(t, { value: 1, receivedAt: NOW - 1500, changedAt: NOW - 60_000, intervalMs: 2000 });
    expect(run(readings).mismatch).toBe(false);
    // A BMS sample received well after the break that still reads closed is a real contradiction.
    readings.set(BMS.Acc, { value: 1, receivedAt: NOW - 100, changedAt: NOW - 60_000, intervalMs: 2000 });
    const status = run(readings);
    expect(mismatchOf(status, 'acc-sense')).toBe(true);
    expect(mismatchOf(status, 'tsip-sense')).toBe(false);
  });

  it('non-zero counts as closed', () => {
    const readings = allClosed();
    for (const t of MEASURED_TOPICS) readings.set(t, { value: 2, receivedAt: NOW, changedAt: NOW });
    expect(run(readings).verdict).toBe('closed');
  });

  it('reports value and age for measured nodes', () => {
    const readings = allClosed();
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW - 3000, changedAt: NOW - 3000 });
    const tsms = run(readings).nodes.find((n) => n.node.id === 'tsms')!;
    expect(tsms.value).toBe(1);
    expect(tsms.ageMs).toBe(3000);
    expect(run(readings).nodes.find((n) => n.node.id === 'glvms')!.value).toBeUndefined();
  });

  it('goes stale after a few missed messages once the rate is known', () => {
    const readings = allClosed();
    for (const t of topicsOf('BMS')) readings.set(t, { value: 1, receivedAt: NOW, changedAt: NOW, intervalMs: 1000 });
    expect(run(readings, NOW + 5000).verdict).toBe('closed');
    // VCU readings have no known rate, so the 60 s fallback keeps them live; BMS at 1 Hz is stale after 5 s.
    const status = run(readings, NOW + 5001);
    expect(status.verdict).toBe('unknown');
    expect(status.silentBoards).toEqual(['BMS']);
  });

  // Bug: staleness was per board, so any message from a board (another CAN frame, the derived CAN
  // latch, BMS/Shutdown/State) kept every reading from that board live, however old.
  it('judges each reading by its own age, not by the last message from its board', () => {
    const readings = allClosed();
    age(readings, 'VCU', 61_000);
    const status = run(readings);
    expect(stateOf(status, 'tsms')).toBe('no-data');
    expect(nodeOf(status, 'can-latch').value).toBe(1);
    expect(stateOf(status, 'can-latch')).toBe('closed');
    expect(status.verdict).toBe('unknown');
  });

  it('reports how long each reading stays live', () => {
    const readings = allClosed();
    readings.set(VCU.TSMS, { value: 1, receivedAt: NOW, changedAt: NOW, intervalMs: 250 });
    const status = run(readings);
    expect(nodeOf(status, 'tsms').staleAfterMs).toBe(3000);
    expect(nodeOf(status, 'hvd').staleAfterMs).toBe(60_000);
    expect(nodeOf(status, 'can-latch').staleAfterMs).toBe(60_000);
    expect(nodeOf(status, 'glvms').staleAfterMs).toBeUndefined();
  });
});

// The 0x502 faults say whether a fault is tripped, not whether there is loop voltage after the latch
// (it can stay latched after its fault clears), so the derived CAN latch only ever shows an opening.
describe('computeLoopStatus: the CAN latch shows only an opening', () => {
  // Bug: a routine BRB press or latch trip flagged the CAN latch as a mismatch, because its "all
  // faults clear" reading of 1 was taken for loop voltage after a break.
  it('is downstream-open, never a mismatch, when the loop breaks upstream of it', () => {
    const readings = allClosed();
    openFrom(readings, VCU.BMS);
    const status = run(readings);
    expect(stateOf(status, 'can-latch')).toBe('downstream-open');
    expect(mismatchOf(status, 'can-latch')).toBe(false);
    expect(status.mismatch).toBe(false);
    expect(status.verdict).toBe('open');
    expect(suspectIds(status)).toEqual(['side-brb-r', 'side-brb-l', 'bms-latch']);
  });

  // Bug: the derived latch and the GPIOs are both VCU, so a GPIO sample taken before the trip was
  // flagged as contradicting it, though 0x502 and 0x123 are sampled independently.
  it('needs a GPIO sample taken after a trip before flagging a mismatch', () => {
    const readings = allClosed();
    for (const t of MEASURED_TOPICS) {
      readings.set(t, { value: 1, receivedAt: NOW - 700, changedAt: NOW - 10_000, intervalMs: 250 });
    }
    setFaults(readings, 0, { receivedAt: NOW - 600, intervalMs: 250 });
    readings.set(VCU_CRITICAL_FAULT_TOPICS[1], { value: 1, receivedAt: NOW - 600, changedAt: NOW - 600, intervalMs: 250 });
    const status = run(readings);
    expect(suspectIds(status)).toEqual(['can-latch']);
    expect(status.mismatch).toBe(false);
    // A 0x123 frame received well after the trip that still reads closed is a real contradiction.
    readings.set(VCU.HV_C, { value: 1, receivedAt: NOW - 50, changedAt: NOW - 10_000, intervalMs: 250 });
    expect(mismatchOf(run(readings), 'mc-hvil')).toBe(true);
  });

  // Bug: with its faults clear the latch read as a closed measurement point, so a break at MC HVIL
  // blamed MC HVIL alone, though a latch that stayed latched would read the same.
  it('is a suspect with the next measured node when its faults are clear', () => {
    const readings = allClosed();
    openFrom(readings, VCU.HV_C);
    expect(suspectIds(run(readings))).toEqual(['can-latch', 'mc-hvil']);
  });

  it('does not make the verdict unknown or the VCU silent when its faults are stale', () => {
    const readings = allClosed();
    setFaults(readings, 0, { receivedAt: NOW - 61_000 });
    const status = run(readings);
    expect(status.verdict).toBe('closed');
    expect(status.silentBoards).toEqual([]);
    expect(stateOf(status, 'can-latch')).toBe('closed');
  });

  it('is not evidence that the GLV master switch is closed', () => {
    const readings = allClosed();
    // 0x123 is silent, 0x502 still reports every fault clear.
    topicsOf('VCU').forEach((t) => readings.delete(t));
    openFrom(readings, BMS.Acc);
    expect(suspectIds(run(readings))).toEqual([
      'glvms',
      'side-brb-r',
      'side-brb-l',
      'can-latch',
      'em-interlock',
      'acc-sense'
    ]);
  });
});

describe('staleness', () => {
  const reading = (intervalMs?: number): Reading => ({ value: 1, receivedAt: NOW, changedAt: NOW, intervalMs });

  it('falls back to 60 s until the message rate is known', () => {
    expect(staleAfterMs(reading())).toBe(STALE_AFTER_MS);
  });

  it('is a multiple of the message interval, clamped', () => {
    expect(staleAfterMs(reading(250))).toBe(MIN_STALE_AFTER_MS);
    expect(staleAfterMs(reading(2000))).toBe(10_000);
    expect(staleAfterMs(reading(20_000))).toBe(STALE_AFTER_MS);
  });

  it('is live up to and including the timeout', () => {
    expect(isLive(reading(2000), NOW + 10_000)).toBe(true);
    expect(isLive(reading(2000), NOW + 10_001)).toBe(false);
    expect(isLive(undefined, NOW)).toBe(false);
  });
});

describe('nextReading', () => {
  it('starts with no rate and the change time at arrival', () => {
    expect(nextReading(undefined, 1, NOW)).toEqual({ value: 1, receivedAt: NOW, changedAt: NOW });
  });

  it('keeps the change time when a value is re-sent and learns the rate', () => {
    const first = nextReading(undefined, 1, NOW);
    const second = nextReading(first, 1, NOW + 250);
    expect(second).toEqual({ value: 1, receivedAt: NOW + 250, changedAt: NOW, intervalMs: 250 });
    expect(nextReading(second, 0, NOW + 500).changedAt).toBe(NOW + 500);
  });

  it('smooths the interval so one late message does not double the timeout', () => {
    const r = nextReading({ value: 1, receivedAt: NOW, changedAt: NOW, intervalMs: 250 }, 1, NOW + 1250);
    expect(r.intervalMs).toBe(500);
  });

  // Bug: after a board dropped out and came back, its value kept the old change time, so a
  // contradiction appeared without any grace window and "value since" spanned the outage.
  it('treats a message after the reading went stale as a fresh start', () => {
    const prev: Reading = { value: 0, receivedAt: NOW, changedAt: NOW - 30_000, intervalMs: 250 };
    const back = nextReading(prev, 0, NOW + MIN_STALE_AFTER_MS + 1);
    expect(back).toEqual({ value: 0, receivedAt: NOW + MIN_STALE_AFTER_MS + 1, changedAt: NOW + MIN_STALE_AFTER_MS + 1 });
  });

  it('relearns a slower rate instead of flapping stale between messages', () => {
    let r = nextReading(undefined, 1, NOW);
    r = nextReading(r, 1, NOW + 250);
    r = nextReading(r, 1, NOW + 500);
    // The publisher slows to one message every 5 s.
    r = nextReading(r, 1, NOW + 5500);
    r = nextReading(r, 1, NOW + 10_500);
    expect(r.intervalMs).toBe(5000);
    expect(isLive(r, NOW + 10_500 + 20_000)).toBe(true);
  });
});

describe('deriveCanLatch', () => {
  const faults = (value: number, receivedAt = NOW, changedAt = NOW - 1000): Map<string, Reading> =>
    new Map(VCU_CRITICAL_FAULT_TOPICS.map((t) => [t, { value, receivedAt, changedAt, intervalMs: 250 }]));

  it('closed when every critical fault is live and clear, since the last one cleared', () => {
    const readings = faults(0);
    readings.set(VCU_CRITICAL_FAULT_TOPICS[1], { value: 0, receivedAt: NOW, changedAt: NOW - 200, intervalMs: 250 });
    expect(deriveCanLatch(readings, NOW)).toEqual({ value: 1, receivedAt: NOW, changedAt: NOW - 200, intervalMs: 250 });
  });

  it('open when any live critical fault is tripped, since the earliest still-tripped one', () => {
    const readings = faults(0);
    readings.set(VCU_CRITICAL_FAULT_TOPICS[2], { value: 1, receivedAt: NOW, changedAt: NOW - 700, intervalMs: 250 });
    readings.set(VCU_CRITICAL_FAULT_TOPICS[3], { value: 1, receivedAt: NOW, changedAt: NOW - 300, intervalMs: 250 });
    expect(deriveCanLatch(readings, NOW)).toMatchObject({ value: 0, changedAt: NOW - 700 });
  });

  it('no reading until every critical fault has been heard from', () => {
    const readings = faults(0);
    readings.delete(VCU_CRITICAL_FAULT_TOPICS[4]);
    expect(deriveCanLatch(readings, NOW)).toBeUndefined();
    expect(deriveCanLatch(new Map(), NOW)).toBeUndefined();
  });

  // Bug: the latch remembered every fault value ever received, so a fault seen once stayed tripped forever.
  it('ignores stale faults', () => {
    const readings = faults(0);
    readings.set(VCU_CRITICAL_FAULT_TOPICS[0], {
      value: 1,
      receivedAt: NOW - 10_000,
      changedAt: NOW - 10_000,
      intervalMs: 250
    });
    expect(deriveCanLatch(readings, NOW)).toBeUndefined();
    expect(deriveCanLatch(faults(1, NOW - 10_000), NOW)).toBeUndefined();
  });

  it('withDerivedReadings adds the CAN latch without touching the input', () => {
    const readings = faults(0);
    const derived = withDerivedReadings(readings, NOW);
    expect(derived.get(VCU.CAN_LATCH)?.value).toBe(1);
    expect(readings.has(VCU.CAN_LATCH)).toBe(false);
    expect(withDerivedReadings(new Map(), NOW).has(VCU.CAN_LATCH)).toBe(false);
  });
});
