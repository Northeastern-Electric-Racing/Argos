import { SHUTDOWN_LOOP } from './shutdown-loop.model';
import {
  boardFreshness,
  breakNode,
  explainNode,
  formatAge,
  formatValue,
  loopOf,
  loopSummary,
  loopZones,
  NODE_STATE_DISPLAY,
  nodeAriaLabel,
  nodeNotes,
  readStateColours,
  segmentState,
  serverNote,
  SHORT_LABEL,
  shortStateLabel,
  stateLabel
} from './shutdown-loop.display';
import { CssVarReader, MISSING_THEME_COLOUR } from './shutdown-loop.theme';
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

  it('has a short strip label for every loop node, and none for anything else', () => {
    for (const n of SHUTDOWN_LOOP) expect(SHORT_LABEL[n.id]).toBeTruthy();
    expect(Object.keys(SHORT_LABEL).sort()).toEqual(SHUTDOWN_LOOP.map((n) => n.id).sort());
  });

  describe('state colours', () => {
    const STATE_TOKENS = Object.values(NODE_STATE_DISPLAY).map((d) => d.token.replace(/^--color-/, ''));
    /** The state-token colours a class list uses through bg-, border- or stroke- utilities. */
    const stateColoursIn = (classes: string) =>
      classes
        .split(/\s+/)
        .map((c) => /^(?:bg|border|stroke)-(.+)$/.exec(c)?.[1])
        .filter((name): name is string => !!name && STATE_TOKENS.includes(name));

    it.each(Object.entries(NODE_STATE_DISPLAY))('draws %s in its own token only', (_, d) => {
      const name = d.token.replace(/^--color-/, '');
      expect(d.stroke.split(' ')).toContain(`stroke-${name}`);
      for (const classes of [d.marker.measured, d.marker.unmeasured, d.connector]) {
        expect(classes.split(' ')).toContain(`border-${name}`);
      }
      const used = [d.marker.measured, d.marker.unmeasured, d.connector, d.stroke].flatMap(stateColoursIn);
      expect(new Set(used)).toEqual(new Set([name]));
    });

    it('fills measured closed and cause markers with their token', () => {
      expect(NODE_STATE_DISPLAY.closed.marker.measured.split(' ')).toContain('bg-success');
      expect(NODE_STATE_DISPLAY.suspect.marker.measured.split(' ')).toContain('bg-danger');
    });

    it('uses the reserved tokens: danger only for the cause, never the accent', () => {
      expect(NODE_STATE_DISPLAY.suspect.token).toBe('--color-danger');
      expect(NODE_STATE_DISPLAY.closed.token).toBe('--color-success');
      expect(NODE_STATE_DISPLAY['downstream-open'].token).toBe('--color-fg-dim');
      expect(NODE_STATE_DISPLAY['no-data'].token).toBe('--color-fg-muted');
    });

    it('gives each state a wire style: the cause strong and solid, closed normal, the rest muted and dashed', () => {
      expect(NODE_STATE_DISPLAY.suspect).toMatchObject({ emphasis: 'strong', dash: null });
      expect(NODE_STATE_DISPLAY.closed).toMatchObject({ emphasis: 'normal', dash: null });
      expect(NODE_STATE_DISPLAY['downstream-open'].emphasis).toBe('muted');
      expect(NODE_STATE_DISPLAY['no-data'].emphasis).toBe('muted');
      expect(NODE_STATE_DISPLAY['downstream-open'].dash).toBeTruthy();
      expect(NODE_STATE_DISPLAY['no-data'].dash).toBeTruthy();
    });

    it('tells every state apart by shape as well as colour: (icon, dash, emphasis) is distinct per state', () => {
      const shapes = Object.values(NODE_STATE_DISPLAY).map((d) => JSON.stringify([d.icon, d.dash, d.emphasis]));
      expect(new Set(shapes).size).toBe(shapes.length);
      const icons = Object.values(NODE_STATE_DISPLAY).map((d) => d.icon);
      expect(new Set(icons).size).toBe(icons.length);
    });

    it('reads every state colour through the reader, for three.js', () => {
      const read: CssVarReader = (token) =>
        ({ '--color-success': '#00ff00', '--color-danger': '#ff8800', '--color-fg-dim': '#888888' })[token as string] ?? '';
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(readStateColours(read)).toEqual({
        closed: '#00ff00',
        suspect: '#ff8800',
        'downstream-open': '#888888',
        'no-data': MISSING_THEME_COLOUR
      });
    });
  });

  describe('formatAge', () => {
    it.each([
      [400, '<1 s ago'],
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

  describe('segmentState', () => {
    it('gives each wire the state of the loop node before it, and the wire after the break downstream-open', () => {
      const { nodes } = tsmsOpen();
      expect(segmentState(nodes, idx('tsms') - 1)).toBe('closed');
      expect(segmentState(nodes, idx('tsms'))).toBe('downstream-open');
      expect(segmentState(nodes, idx('hvd'))).toBe('downstream-open');
    });

    it('keeps the wires inside a suspect stretch suspect', () => {
      const s = loop({ 'side-brb-r': 'suspect', 'side-brb-l': 'suspect', 'bms-latch': 'suspect' });
      expect(segmentState(s.nodes, idx('side-brb-r'))).toBe('suspect');
      expect(segmentState(s.nodes, idx('side-brb-l'))).toBe('suspect');
      expect(segmentState(s.nodes, idx('bms-latch'))).toBe('downstream-open');
    });
  });

  describe('state labels', () => {
    it('names a single culprit the cause', () => {
      const s = tsmsOpen();
      const tsms = s.nodes[idx('tsms')];
      expect(stateLabel(tsms, s)).toBe('Open — cause');
      expect(shortStateLabel(tsms, s)).toBe('Cause');
      expect(nodeAriaLabel(tsms, s)).toBe('TSMS: Open — cause');
    });

    it('names every member of a wider stretch a possible cause', () => {
      const s = loop({ 'side-brb-r': 'suspect', 'side-brb-l': 'suspect', 'bms-latch': 'suspect' });
      for (const id of ['side-brb-r', 'bms-latch']) {
        expect(stateLabel(s.nodes[idx(id)], s)).toBe('Open — possible cause');
        expect(shortStateLabel(s.nodes[idx(id)], s)).toBe('Suspect');
      }
      expect(nodeAriaLabel(s.nodes[idx('side-brb-r')], s)).toBe('Side BRB R: Open — possible cause (no sensor)');
    });

    it('names loop nodes after the break downstream, and keeps the defaults otherwise', () => {
      const s = tsmsOpen();
      expect(stateLabel(s.nodes[idx('hvd')], s)).toBe('Open — after the break');
      expect(shortStateLabel(s.nodes[idx('hvd')], s)).toBe('Downstream');
      expect(nodeAriaLabel({ ...s.nodes[idx('hvd')], mismatch: true }, s)).toBe(
        'HVD: reads closed after the break — sensor mismatch'
      );
      expect(shortStateLabel({ ...s.nodes[idx('hvd')], mismatch: true }, s)).toBe('Reads 1');
      expect(stateLabel(s.nodes[idx('bots')], s)).toBe('Closed');
    });

    it('works from a view’s nodes alone', () => {
      const s = tsmsOpen();
      expect(loopOf(s.nodes).suspects.map((n) => n.id)).toEqual(['tsms']);
      expect(stateLabel(s.nodes[idx('tsms')], loopOf(s.nodes))).toBe('Open — cause');
    });
  });

  describe('loopSummary', () => {
    it('names the verdict and the break only', () => {
      expect(loopSummary(tsmsOpen())).toBe('LOOP OPEN — cause: TSMS');
      expect(loopSummary(loop({ 'side-brb-r': 'suspect', 'bms-latch': 'suspect' }))).toBe(
        'LOOP OPEN — cause at or before BMS latch'
      );
      expect(loopSummary(loop({}))).toBe('LOOP CLOSED · AIRs on');
      expect(loopSummary(loop({}, { verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }))).toBe(
        'UNKNOWN — no data from VCU and BMS'
      );
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

    it('explains silent readings by their own timeout, never a board message or a fixed duration', () => {
      const s = loop({ 'acc-sense': 'no-data' });
      expect(explainNode({ ...at(s, 'acc-sense'), ageMs: undefined, value: undefined }, s)).toBe(
        'No reading since the page opened, so it is skipped.'
      );
      expect(explainNode({ ...at(s, 'acc-sense'), ageMs: 12_000, staleAfterMs: 3_000 }, s)).toBe(
        'No new reading for 12 s (it goes stale after 3 s without one), so it is skipped.'
      );
      expect(explainNode({ ...at(s, 'acc-sense'), ageMs: 75_000 }, s)).toBe(
        'No new reading for 1 min 15 s, so it is skipped.'
      );
      const inStretch = { ...s, noDataInStretch: [node('acc-sense')] };
      expect(explainNode(at(inStretch, 'acc-sense'), inStretch)).toContain('no live reading, so it could be the cause too');
      expect(explainNode(at(inStretch, 'acc-sense'), inStretch)).not.toMatch(/No message from|60 s/);
    });

    it('names no-data loop nodes in the stretch as having no live reading', () => {
      const s = loop({ 'side-brb-r': 'suspect', 'bms-latch': 'no-data', 'imd-latch': 'suspect' });
      s.suspects = [node('side-brb-r'), node('imd-latch')];
      s.noDataInStretch = [node('bms-latch')];
      expect(explainNode(at(s, 'imd-latch'), s)).toBe(
        'Reads 0: the first open reading. The break is here or in Side BRB R or BMS latch (Side BRB R: no sensor; BMS latch: no live reading).'
      );
      const silentOnly = { ...s, suspects: [node('imd-latch')] };
      expect(explainNode(at(silentOnly, 'imd-latch'), silentOnly)).toBe(
        'Reads 0: the first open reading. The break is here or in BMS latch, which has no live reading.'
      );
    });

    describe('when scylla-server decided the states', () => {
      const server = (s: LoopStatus): LoopStatus => ({ ...s, source: 'server' });

      it('cites the local reading when it agrees with the state', () => {
        const s = server(tsmsOpen());
        expect(explainNode(at(s, 'tsms'), s)).toBe(
          'Reads 0 while the reading before it is closed: the loop is broken here.'
        );
        expect(serverNote(at(s, 'tsms'), s)).toBeUndefined();
      });

      it('reasons from the state, not a contradicting local reading, and notes the disagreement', () => {
        const s = server(tsmsOpen());
        const tsms = { ...at(s, 'tsms'), value: 1 };
        expect(explainNode(tsms, s)).toBe('Open while the reading before it is closed: the loop is broken here.');
        expect(serverNote(tsms, s)).toBe(
          "Decided by scylla-server, which sees every message; this client's latest reading is 1 (closed)."
        );
        const bots = { ...at(s, 'bots'), value: 0 };
        expect(explainNode(bots, s)).toBe('Closed: 24 V is present just after it.');
        expect(serverNote(bots, s)).toContain('latest reading is 0 (open)');
      });

      it('never notes a disagreement for a locally decided loop', () => {
        const s = tsmsOpen();
        expect(serverNote({ ...at(s, 'tsms'), value: 1 }, s)).toBeUndefined();
        expect(serverNote({ ...at(s, 'tsms'), value: 1 }, { ...s, source: undefined })).toBeUndefined();
      });
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

  describe('boardFreshness', () => {
    it('takes each board’s age from its newest reading', () => {
      const s = loop({});
      s.nodes[idx('tsms')].ageMs = 900;
      expect(boardFreshness(s.nodes)).toEqual([
        { board: 'VCU', ageMs: 900, staleCount: 0, stale: false },
        { board: 'BMS', ageMs: 2000, staleCount: 0, stale: false }
      ]);
    });

    it('is stale only when every measured loop node of the board is no-data, and counts the stale ones', () => {
      const s = loop({ 'acc-sense': 'no-data' });
      expect(boardFreshness(s.nodes)[1]).toMatchObject({ board: 'BMS', staleCount: 1, stale: false });
      const bms = SHUTDOWN_LOOP.filter((n) => n.board === 'BMS' && n.topic).map((n) => n.id);
      const silent = loop(Object.fromEntries(bms.map((id) => [id, 'no-data'] as const)));
      const silentBms = silent.nodes.map((n) => (n.node.board === 'BMS' ? { ...n, ageMs: undefined } : n));
      expect(boardFreshness(silentBms)[1]).toEqual({ board: 'BMS', ageMs: undefined, staleCount: bms.length, stale: true });
    });

    it('never decides staleness from an age: an old reading logic still calls live is not stale', () => {
      const s = loop({});
      const old = s.nodes.map((n) => (n.node.board === 'VCU' ? { ...n, ageMs: 61_000 } : n));
      expect(boardFreshness(old)[0]).toMatchObject({ ageMs: 61_000, staleCount: 0, stale: false });
    });
  });
});
