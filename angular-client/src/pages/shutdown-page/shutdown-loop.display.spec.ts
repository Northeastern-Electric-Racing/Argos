import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import {
  boardFreshness,
  breakNode,
  explainNode,
  formatAge,
  formatValue,
  loopZones,
  NODE_STATE_DISPLAY,
  nodeNotes,
  SHORT_LABEL
} from './shutdown-loop.display';
import { LoopStatus, NodeState, NodeStatus } from './shutdown-loop.utils';

const node = (id: string) => SHUTDOWN_LOOP.find((n) => n.id === id)!;
const idx = (id: string) => SHUTDOWN_LOOP.findIndex((n) => n.id === id);

/** Builds a loop where `states` overrides each node's state (default closed). */
const loop = (states: Record<string, NodeState>, extra: Partial<LoopStatus> = {}): LoopStatus => {
  const nodes: NodeStatus[] = SHUTDOWN_LOOP.map((n) => ({
    node: n,
    state: states[n.id] ?? 'closed',
    value: n.topic ? (states[n.id] === 'suspect' || states[n.id] === 'downstream-open' ? 0 : 1) : undefined,
    ageMs: n.topic ? 2000 : undefined,
    mismatch: false
  }));
  const suspects = nodes.filter((s) => s.state === 'suspect').map((s) => s.node);
  return {
    verdict: suspects.length ? 'open' : 'closed',
    nodes,
    suspects,
    noDataInStretch: [],
    silentBoards: [],
    mismatch: false,
    airsEnergized: !suspects.length,
    ...extra
  };
};

/** TSMS is the single cause. */
const tsmsOpen = (): LoopStatus => {
  const states: Record<string, NodeState> = { tsms: 'suspect' };
  SHUTDOWN_LOOP.slice(idx('tsms') + 1).forEach((n) => (states[n.id] = 'downstream-open'));
  return loop(states);
};

describe('shutdown loop display', () => {
  it('has a label, short label, icon and colour for every state', () => {
    for (const d of Object.values(NODE_STATE_DISPLAY)) {
      expect(d.label).toBeTruthy();
      expect(d.short).toBeTruthy();
      expect(d.icon).toMatch(/^[a-z_]+$/);
      expect(d.text).toMatch(/^text-/);
    }
  });

  it('has a short strip label for every node', () => {
    for (const n of SHUTDOWN_LOOP) expect(SHORT_LABEL[n.id]).toBeTruthy();
  });

  describe('formatAge', () => {
    it.each([
      [400, 'just now'],
      [3000, '3 s ago'],
      [59_400, '59 s ago'],
      [75_000, '1 min 15 s ago'],
      [3_600_000, '60 min ago']
    ])('%i ms → %s', (ms, text) => expect(formatAge(ms)).toBe(text));
  });

  it('formats raw values with their meaning', () => {
    expect(formatValue(1)).toBe('1 (closed)');
    expect(formatValue(0)).toBe('0 (open)');
    expect(formatValue(undefined)).toBe('—');
  });

  describe('loopZones', () => {
    it('marks a single culprit as a one-node stretch and everything after as downstream', () => {
      const zones = loopZones(tsmsOpen().nodes);
      expect(zones[idx('tsms')]).toEqual({ zone: 'stretch', start: true, end: true });
      expect(zones[idx('cockpit-brb')].zone).toBeNull();
      expect(zones[idx('hvd')]).toEqual({ zone: 'downstream', start: true, end: false });
      expect(zones[idx('airs')]).toEqual({ zone: 'downstream', start: false, end: true });
    });

    it('brackets a suspect stretch, including no-data nodes just before it', () => {
      const s = loop({
        hvd: 'no-data',
        'em-interlock': 'suspect',
        'acc-sense': 'suspect',
        'tsip-sense': 'downstream-open',
        'ts-minus': 'downstream-open',
        'ts-plus': 'downstream-open',
        airs: 'downstream-open'
      });
      const zones = loopZones(s.nodes);
      expect(zones[idx('tsms')].zone).toBeNull();
      expect(zones[idx('hvd')]).toEqual({ zone: 'stretch', start: true, end: false });
      expect(zones[idx('em-interlock')]).toEqual({ zone: 'stretch', start: false, end: false });
      expect(zones[idx('acc-sense')]).toEqual({ zone: 'stretch', start: false, end: true });
    });

    it('has no zones while the loop is closed', () => {
      expect(loopZones(loop({}).nodes).every((z) => z.zone === null)).toBe(true);
    });
  });

  it('finds the break node (the first open reading)', () => {
    expect(breakNode(tsmsOpen())?.id).toBe('tsms');
    expect(breakNode(loop({}))).toBeUndefined();
  });

  describe('explainNode', () => {
    const at = (s: LoopStatus, id: string) => s.nodes[idx(id)];

    it('names the single culprit', () => {
      const s = tsmsOpen();
      expect(explainNode(at(s, 'tsms'), s)).toBe('Reads 0 while the reading before it is closed: the loop is broken here.');
    });

    it('explains downstream nodes as not the cause', () => {
      const s = tsmsOpen();
      expect(explainNode(at(s, 'hvd'), s)).toBe('Open because TSMS upstream is open. Not the cause.');
      expect(explainNode(at(s, 'airs'), s)).toBe('De-energized: the loop is open upstream at TSMS.');
    });

    it('explains a mismatch', () => {
      const s = tsmsOpen();
      const hvd = { ...at(s, 'hvd'), value: 1, mismatch: true };
      expect(explainNode(hvd, s)).toBe('Reads 1 (closed) after the break at TSMS: a sensor or wiring mismatch.');
    });

    it('explains an unmeasured suspect by its neighbours', () => {
      const s = loop({
        'side-brb-r': 'suspect',
        'side-brb-l': 'suspect',
        'bms-latch': 'suspect'
      });
      expect(explainNode(at(s, 'side-brb-l'), s)).toBe(
        'No sensor. It sits between GLV master switch (closed) and BMS latch (open), so it could be the break.'
      );
      expect(explainNode(at(s, 'bms-latch'), s)).toBe(
        'Reads 0: the first open reading. The break is here or in Side BRB R or Side BRB L, which have no reading of their own.'
      );
    });

    it('uses the singular when one other node shares the stretch', () => {
      const s = loop({ 'em-interlock': 'suspect', 'acc-sense': 'suspect' });
      expect(explainNode(at(s, 'acc-sense'), s)).toBe(
        'Reads 0: the first open reading. The break is here or in Energy meter interlock, which has no reading of its own.'
      );
    });

    it('explains closed nodes, measured and inferred', () => {
      const s = loop({});
      expect(explainNode(at(s, 'tsms'), s)).toBe('Reads 1: 24 V is present just after it.');
      expect(explainNode(at(s, 'side-brb-r'), s)).toBe(
        'No sensor of its own. Inferred closed: BMS latch further along the loop reads 1.'
      );
      expect(explainNode(at(s, 'airs'), s)).toBe('Energized: every reading is live and closed.');
    });

    it('explains silent readings', () => {
      const s = loop({ 'acc-sense': 'no-data' });
      expect(explainNode({ ...at(s, 'acc-sense'), ageMs: undefined, value: undefined }, s)).toBe(
        'No message from the BMS since the page opened, so this reading is skipped.'
      );
      expect(explainNode({ ...at(s, 'acc-sense'), ageMs: 75_000 }, s)).toBe(
        'No message from the BMS for 1 min 15 s, so this reading is skipped.'
      );
      const inStretch = { ...s, noDataInStretch: [node('acc-sense')] };
      expect(explainNode(at(inStretch, 'acc-sense'), inStretch)).toContain('it could be the cause too');
    });
  });

  it('notes placeholders, unmeasured nodes and mismatches', () => {
    const s = loop({});
    expect(nodeNotes(s.nodes[idx('em-interlock')])).toEqual([
      'Placeholder: no reading yet. Treated like any unmeasured node.'
    ]);
    expect(nodeNotes(s.nodes[idx('glvms')])).toEqual(['No sensor: its state is inferred from the readings around it.']);
    expect(nodeNotes(s.nodes[idx('tsms')])).toEqual([]);
  });

  it('works out each board’s freshness from its newest reading', () => {
    const s = loop({});
    s.nodes[idx('tsms')].ageMs = 900;
    const fresh = boardFreshness(s.nodes);
    expect(fresh).toEqual([
      { board: 'VCU', ageMs: 900, stale: false },
      { board: 'BMS', ageMs: 2000, stale: false }
    ]);
    const silent = s.nodes.map((n) => (n.node.board === 'BMS' ? { ...n, ageMs: undefined } : n));
    expect(boardFreshness(silent)[1]).toEqual({ board: 'BMS', ageMs: undefined, stale: true });
    const old = s.nodes.map((n) => (n.node.board === 'VCU' ? { ...n, ageMs: 61_000 } : n));
    expect(boardFreshness(old)[0].stale).toBe(true);
  });
});
