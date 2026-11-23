import { NODE_STATE_DISPLAY, segmentState, WIRE_WIDTH } from '../../shutdown-loop.display';
import { LoopNode, SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import {
  badgeModels,
  CarSceneError,
  changedKeys,
  dashPieces,
  fallbackReasonFor,
  hasExactAnchorPrefix,
  MARKER_SHAPES,
  markerKey,
  MATERIAL_MODE_KEY,
  modelSummary,
  parseNodeAnchorName,
  readMaterialMode,
  resolveNodePositions,
  sameSceneStatus,
  sceneStatus,
  segmentKey,
  segmentStyle,
  unitScaleFor,
  writeMaterialMode
} from './car-view-3d.utils';

const node = (id: string, topic?: string): LoopNode => ({
  id,
  label: id.toUpperCase(),
  kind: 'switch',
  topic,
  board: topic ? 'VCU' : undefined,
  car: { x: 0, y: 0 }
});
const status = (n: LoopNode, state: NodeState, extra: Partial<NodeStatus> = {}): NodeStatus => ({
  node: n,
  state,
  mismatch: false,
  ...extra
});
const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const BREAK_AT_TSMS: NodeStatus[] = SHUTDOWN_LOOP.map((n, i) =>
  status(n, i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open', {
    value: n.topic ? (i < TSMS ? 1 : 0) : undefined,
    ageMs: n.topic ? 1000 : undefined
  })
);

describe('parseNodeAnchorName', () => {
  it('reads the loop node id from a shutdown: name', () => {
    expect(parseNodeAnchorName('shutdown:tsms')).toBe('tsms');
    expect(parseNodeAnchorName('shutdown:side-brb-r')).toBe('side-brb-r');
  });

  it('accepts exporters that swap the colon and hyphens for underscores, any case, and a .001 suffix', () => {
    expect(parseNodeAnchorName('Shutdown_Side_BRB_R.001')).toBe('side-brb-r');
    expect(parseNodeAnchorName('SHUTDOWN_TSMS')).toBe('tsms');
  });

  it('ignores names without the prefix', () => {
    expect(parseNodeAnchorName('wheel-front-left')).toBeUndefined();
    expect(parseNodeAnchorName('tsms')).toBeUndefined();
  });

  it('only treats the exact documented prefix as a typo candidate', () => {
    expect(hasExactAnchorPrefix('shutdown:tsm')).toBe(true);
    expect(hasExactAnchorPrefix('Shutdown_Button_Left')).toBe(false);
  });
});

describe('resolveNodePositions', () => {
  const nodes = [node('a'), node('b'), node('c')];
  const table: Record<string, Vec3> = { a: [0, 0, 1], b: [0, 0, 2] };

  it('uses the table, and lets a model anchor override it', () => {
    const { positions, missing } = resolveNodePositions(nodes, table, new Map([['b', [1, 1, 1] as Vec3]]));
    expect(positions.get('a')).toEqual({ position: [0, 0, 1], source: 'table' });
    expect(positions.get('b')).toEqual({ position: [1, 1, 1], source: 'model' });
    expect(missing).toEqual(['c']);
  });

  it('places every loop node from the shipped table', () => {
    expect(resolveNodePositions(SHUTDOWN_LOOP, NODE_POSITIONS_3D).missing).toEqual([]);
  });
});

describe('unitScaleFor', () => {
  it.each([
    [2.9, 1],
    [290, 0.01],
    [2900, 0.001],
    [114, 0.0254]
  ])('brings a %s-unit model to a car-sized length (scale %s)', (size, scale) => {
    expect(unitScaleFor(size)).toEqual({ scale, fits: true });
  });

  it('keeps the scale at 1 and says so when no unit makes a car', () => {
    expect(unitScaleFor(80_000)).toEqual({ scale: 1, fits: false });
    expect(unitScaleFor(0)).toEqual({ scale: 1, fits: false });
    expect(unitScaleFor(NaN)).toEqual({ scale: 1, fits: false });
  });
});

describe('modelSummary', () => {
  it('names the anchored loop nodes, the scale and any unknown anchors', () => {
    expect(
      modelSummary({ file: 'car.glb', total: 19, anchored: ['tsms', 'side-brb-r', 'hvd'], scale: 1, unknownAnchors: [] })
    ).toBe('car.glb: 3/19 loop nodes from anchors (tsms, side-brb-r, hvd), scale ×1, unknown: none');
    expect(modelSummary({ file: 'car.glb', total: 19, anchored: [], scale: 0.001, unknownAnchors: ['shutdown:tsm'] })).toBe(
      'car.glb: 0/19 loop nodes from anchors, scale ×0.001, unknown: shutdown:tsm'
    );
  });
});

describe('sceneStatus', () => {
  it('keeps only what the scene draws, with wire states from the shared segmentState', () => {
    const s = sceneStatus(BREAK_AT_TSMS);
    expect(s.nodes[TSMS]).toEqual({ id: 'tsms', state: 'suspect', measured: true, mismatch: false });
    expect(s.nodes[0].measured).toBe(false);
    expect(s.segments).toEqual(BREAK_AT_TSMS.slice(0, -1).map((_, i) => segmentState(BREAK_AT_TSMS, i)));
    // The wire out of the break is already dead.
    expect(s.segments[TSMS]).toBe('downstream-open');
  });

  it('is unchanged when only values and ages tick, so the scene is not touched', () => {
    const later = BREAK_AT_TSMS.map((s) => ({ ...s, ageMs: (s.ageMs ?? 0) + 1000, value: s.value }));
    expect(sameSceneStatus(sceneStatus(BREAK_AT_TSMS), sceneStatus(later))).toBe(true);
  });

  it('changes when a state or a mismatch changes', () => {
    const mismatch = BREAK_AT_TSMS.map((s, i) => (i === TSMS + 2 ? { ...s, mismatch: true } : s));
    expect(sameSceneStatus(sceneStatus(BREAK_AT_TSMS), sceneStatus(mismatch))).toBe(false);
    const closed = BREAK_AT_TSMS.map((s) => ({ ...s, state: 'closed' as const }));
    expect(sameSceneStatus(sceneStatus(BREAK_AT_TSMS), sceneStatus(closed))).toBe(false);
  });
});

describe('change keys', () => {
  it('gives every state its own marker shape and key', () => {
    expect(new Set(Object.values(MARKER_SHAPES)).size).toBe(4);
    const key = (state: NodeState, measured = true, mismatch = false) => markerKey({ id: 'x', state, measured, mismatch });
    expect(key('closed')).not.toBe(key('suspect'));
    expect(key('closed')).not.toBe(key('closed', false));
    expect(key('closed')).not.toBe(key('closed', true, true));
  });

  it('lists only the ids whose key changed', () => {
    const before = new Map([
      ['a', '1'],
      ['b', '1']
    ]);
    const after = new Map([
      ['a', '1'],
      ['b', '2'],
      ['c', '1']
    ]);
    expect(changedKeys(before, after)).toEqual(['b', 'c']);
    expect(changedKeys(after, after)).toEqual([]);
  });

  it('keys a wire by its colour, emphasis and dash', () => {
    expect(segmentKey('closed')).not.toBe(segmentKey('suspect'));
    expect(segmentKey('downstream-open')).not.toBe(segmentKey('no-data'));
  });
});

describe('segmentStyle', () => {
  it('follows the 2D wire language: the cause strong and solid, closed solid, dead wire dashed', () => {
    expect(segmentStyle('suspect')).toMatchObject({ emphasis: 'strong', dash: null });
    expect(segmentStyle('closed')).toMatchObject({ emphasis: 'normal', dash: null });
    expect(segmentStyle('downstream-open').emphasis).toBe(NODE_STATE_DISPLAY['downstream-open'].emphasis);
    expect(segmentStyle('downstream-open').dash).not.toBeNull();
    expect(segmentStyle('no-data').dash).not.toBeNull();
  });

  it('weighs wires as the 2D view does (WIRE_WIDTH): the cause thickest, dead wire thinnest', () => {
    const r = (state: NodeState) => segmentStyle(state).radius;
    expect(r('suspect') / r('closed')).toBeCloseTo(WIRE_WIDTH.strong.core / WIRE_WIDTH.normal.core);
    expect(r('closed')).toBeGreaterThan(r('downstream-open'));
    expect(r('downstream-open')).toBe(r('no-data'));
  });

  it('draws downstream (dashed) and no data (dotted) with different piece lengths', () => {
    const [downDash] = segmentStyle('downstream-open').dash!;
    const [noDataDash] = segmentStyle('no-data').dash!;
    expect(downDash).toBeGreaterThan(noDataDash * 2);
  });
});

describe('dashPieces', () => {
  it('splits a line into dashes and gaps, ending on the line', () => {
    const pieces = dashPieces([0, 0, 0], [0, 0, 1], 0.3, 0.2);
    expect(pieces.length).toBe(2);
    expect(pieces[0]).toEqual([
      [0, 0, 0],
      [0, 0, 0.3]
    ]);
    expect(pieces[1][0][2]).toBeCloseTo(0.5);
    expect(pieces[1][1][2]).toBeCloseTo(0.8);
  });

  it('returns nothing for a zero-length line', () => {
    expect(dashPieces([1, 1, 1], [1, 1, 1], 0.1, 0.1)).toEqual([]);
  });
});

describe('badgeModels', () => {
  it('numbers badges in loop order with the state glyph', () => {
    const badges = badgeModels(BREAK_AT_TSMS);
    expect(badges.map((b) => b.order)).toEqual(BREAK_AT_TSMS.map((_, i) => i + 1));
    expect(badges[0].icon).toBe(NODE_STATE_DISPLAY.closed.icon);
    expect(badges[TSMS + 1].icon).toBe(NODE_STATE_DISPLAY['downstream-open'].icon);
  });

  it('names only the suspect, so the cause reads without colour', () => {
    const badges = badgeModels(BREAK_AT_TSMS);
    expect(badges[TSMS]).toMatchObject({ suspect: true, name: 'TSMS', icon: NODE_STATE_DISPLAY.suspect.icon });
    expect(badges.filter((b) => b.name !== null).map((b) => b.id)).toEqual(['tsms']);
  });

  it('gives no data its own glyph, apart from downstream', () => {
    const [noData] = badgeModels([status(node('a', 't'), 'no-data')]);
    const [down] = badgeModels([status(node('a', 't'), 'downstream-open')]);
    expect(noData.icon).not.toBe(down.icon);
  });

  it('flags a mismatch, and draws unmeasured loop nodes hollow', () => {
    const [measured, unmeasured] = badgeModels([
      status(node('a', 't'), 'downstream-open', { mismatch: true }),
      status(node('b'), 'downstream-open')
    ]);
    expect(measured.mismatch).toBe(true);
    expect(measured.classes).toBe(NODE_STATE_DISPLAY['downstream-open'].marker.measured);
    expect(unmeasured.classes).toBe(NODE_STATE_DISPLAY['downstream-open'].marker.unmeasured);
  });
});

describe('fallbackReasonFor', () => {
  it('maps scene errors to their reason and anything else to init', () => {
    expect(fallbackReasonFor(new CarSceneError('webgl'))).toBe('webgl');
    expect(fallbackReasonFor(new CarSceneError('model'))).toBe('model');
    expect(fallbackReasonFor(new CarSceneError('init'))).toBe('init');
    expect(fallbackReasonFor(new Error('boom'))).toBe('init');
  });
});

describe('material mode storage', () => {
  it('defaults to see-through and reads a stored choice', () => {
    expect(readMaterialMode(() => ({ getItem: () => null }))).toBe('see-through');
    expect(readMaterialMode(() => ({ getItem: () => 'solid' }))).toBe('solid');
    expect(readMaterialMode(() => ({ getItem: () => 'chrome' }))).toBe('see-through');
  });

  it('survives storage that throws', () => {
    const throwing = () => {
      throw new Error('SecurityError');
    };
    expect(readMaterialMode(throwing)).toBe('see-through');
    expect(() => writeMaterialMode(throwing, 'solid')).not.toThrow();
  });

  it('writes under its own key', () => {
    const setItem = vi.fn();
    writeMaterialMode(() => ({ setItem }), 'original');
    expect(setItem).toHaveBeenCalledWith(MATERIAL_MODE_KEY, 'original');
  });
});
