import { LoopNode, SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NODE_POSITIONS_3D, Vec3 } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import {
  CarSceneError,
  FALLBACK_STATE_COLOURS,
  fallbackReasonFor,
  fitDistance,
  isWebGLAvailable,
  loopSegments,
  MARKER_SHAPES,
  markerStyle,
  nearestPoint,
  nodeDetail,
  parseNodeAnchorName,
  readViewMode,
  resolveNodePositions,
  resolveStateColours,
  unitScaleFor,
  writeViewMode
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
const COLOURS = { closed: '#0f0', suspect: '#f00', 'downstream-open': '#888', 'no-data': '#99a' };

describe('parseNodeAnchorName', () => {
  it('reads the node id from a shutdown: name', () => {
    expect(parseNodeAnchorName('shutdown:tsms')).toBe('tsms');
    expect(parseNodeAnchorName('shutdown:side-brb-r')).toBe('side-brb-r');
  });

  it('accepts exporters that swap the colon and hyphens for underscores, and any case', () => {
    expect(parseNodeAnchorName('shutdown_side_brb_r')).toBe('side-brb-r');
    expect(parseNodeAnchorName('Shutdown:TSMS')).toBe('tsms');
  });

  it('drops a Blender duplicate suffix', () => {
    expect(parseNodeAnchorName('shutdown:hvd.001')).toBe('hvd');
  });

  it('ignores other names', () => {
    expect(parseNodeAnchorName('wheel-front-left')).toBeUndefined();
    expect(parseNodeAnchorName('shutdown')).toBeUndefined();
    expect(parseNodeAnchorName('shutdown:')).toBeUndefined();
    expect(parseNodeAnchorName('')).toBeUndefined();
  });
});

describe('resolveNodePositions', () => {
  const nodes = [node('a'), node('b'), node('c')];
  const table: Record<string, Vec3> = { a: [1, 0, 0], b: [2, 0, 0], c: [3, 0, 0] };

  it('uses the table when the model has no anchors', () => {
    const r = resolveNodePositions(nodes, table, []);
    expect(r.positions.get('b')).toEqual({ position: [2, 0, 0], source: 'table' });
    expect(r.missing).toEqual([]);
    expect(r.unknownAnchors).toEqual([]);
  });

  it('lets a named empty in the model override the table', () => {
    const r = resolveNodePositions(nodes, table, [{ name: 'shutdown:b', position: [9, 8, 7] }]);
    expect(r.positions.get('b')).toEqual({ position: [9, 8, 7], source: 'model' });
    expect(r.positions.get('a')?.source).toBe('table');
  });

  it('keeps the first anchor when a node is named twice', () => {
    const r = resolveNodePositions(nodes, table, [
      { name: 'shutdown:b', position: [9, 9, 9] },
      { name: 'shutdown:b.001', position: [5, 5, 5] }
    ]);
    expect(r.positions.get('b')?.position).toEqual([9, 9, 9]);
  });

  it('reports anchors for unknown ids and ignores unrelated model nodes', () => {
    const r = resolveNodePositions(nodes, table, [
      { name: 'shutdown:nope', position: [0, 0, 0] },
      { name: 'body', position: [0, 0, 0] }
    ]);
    expect(r.unknownAnchors).toEqual(['shutdown:nope']);
    expect(r.positions.size).toBe(3);
  });

  it('reports nodes with neither an anchor nor a table entry', () => {
    const r = resolveNodePositions([...nodes, node('d')], table, []);
    expect(r.missing).toEqual(['d']);
    expect(r.positions.has('d')).toBe(false);
  });

  it('places every real loop node from the shipped table', () => {
    const r = resolveNodePositions(SHUTDOWN_LOOP, NODE_POSITIONS_3D, []);
    expect(r.missing).toEqual([]);
    expect(r.positions.size).toBe(SHUTDOWN_LOOP.length);
  });
});

describe('resolveStateColours', () => {
  it('reads each state colour through its NODE_STATE_DISPLAY class', () => {
    const seen: string[] = [];
    const colours = resolveStateColours((cssClass) => {
      seen.push(cssClass);
      return { 'state-closed': ' #111111 ', 'state-suspect': '#222222' }[cssClass];
    });
    expect(seen.sort()).toEqual(['state-closed', 'state-downstream', 'state-no-data', 'state-suspect']);
    expect(colours.closed).toBe('#111111');
    expect(colours.suspect).toBe('#222222');
  });

  it('falls back to the shutdown-states.css values when a colour cannot be read', () => {
    expect(resolveStateColours(() => '')).toEqual(FALLBACK_STATE_COLOURS);
    expect(resolveStateColours(() => undefined)['no-data']).toBe('#8b93a1');
  });
});

describe('loopSegments', () => {
  const nodes = [node('a', 't/a'), node('b'), node('c', 't/c'), node('d')];
  const { positions } = resolveNodePositions(nodes, { a: [0, 0, 0], b: [1, 0, 0], c: [2, 0, 0], d: [3, 0, 0] }, []);
  const statuses = [
    status(nodes[0], 'closed'),
    status(nodes[1], 'suspect'),
    status(nodes[2], 'suspect'),
    status(nodes[3], 'downstream-open')
  ];

  it('joins nodes in series order', () => {
    const segs = loopSegments(statuses, positions, COLOURS);
    expect(segs.map((s) => s.key)).toEqual(['a-b', 'b-c', 'c-d']);
    expect(segs[1].from).toEqual([1, 0, 0]);
    expect(segs[1].to).toEqual([2, 0, 0]);
  });

  it('colours each segment by the state of the node it leaves, as the 2D view does', () => {
    const segs = loopSegments(statuses, positions, COLOURS);
    expect(segs.map((s) => s.state)).toEqual(['closed', 'suspect', 'suspect']);
    expect(segs.map((s) => s.colour)).toEqual(['#0f0', '#f00', '#f00']);
  });

  it('draws the cause thick and downstream / no-data thin, so the break reads without colour', () => {
    const mixed = [
      status(nodes[0], 'closed'),
      status(nodes[1], 'suspect'),
      status(nodes[2], 'downstream-open'),
      status(nodes[3], 'no-data')
    ];
    expect(loopSegments(mixed, positions, COLOURS).map((s) => s.emphasis)).toEqual(['normal', 'strong', 'muted']);
    const fromNoData = [status(nodes[2], 'no-data'), status(nodes[3], 'closed')];
    expect(loopSegments(fromNoData, positions, COLOURS)[0].emphasis).toBe('muted');
  });

  it('skips a segment whose end has no position', () => {
    const partial = new Map(positions);
    partial.delete('c');
    expect(loopSegments(statuses, partial, COLOURS).map((s) => s.key)).toEqual(['a-b']);
  });
});

describe('markerStyle', () => {
  it('gives every state its own shape', () => {
    expect(new Set(Object.values(MARKER_SHAPES)).size).toBe(4);
  });

  it('draws unmeasured nodes hollow and measured ones solid, in their state colour', () => {
    expect(markerStyle(status(node('x'), 'closed'), COLOURS)).toEqual({
      shape: MARKER_SHAPES.closed,
      hollow: true,
      colour: '#0f0'
    });
    expect(markerStyle(status(node('y', 't/y'), 'suspect'), COLOURS)).toEqual({
      shape: MARKER_SHAPES.suspect,
      hollow: false,
      colour: '#f00'
    });
  });
});

describe('nodeDetail', () => {
  it('describes a measured node with its value and age', () => {
    const d = nodeDetail(status(node('tsms', 'VCU/Shutdown/TSMS_GPIO'), 'suspect', { value: 0, ageMs: 2600 }));
    expect(d).toEqual({ stateLabel: 'Open — cause', topic: 'VCU/Shutdown/TSMS_GPIO', value: '0 (open)', age: '3 s ago' });
  });

  it('says when a node has no sensor or no data', () => {
    expect(nodeDetail(status(node('glvms'), 'closed'))).toMatchObject({ topic: 'no sensor', value: '—', age: '—' });
    expect(nodeDetail(status(node('hvd', 't/hvd'), 'no-data'))).toMatchObject({ value: 'no data', age: '—' });
    expect(nodeDetail(status(node('hvd', 't/hvd'), 'closed', { value: 1, ageMs: 0 })).value).toBe('1 (closed)');
  });
});

describe('unitScaleFor', () => {
  it('keeps a model exported in metres', () => {
    expect(unitScaleFor(2.9)).toBe(1);
  });

  it('scales a millimetre or centimetre export down to metres', () => {
    expect(unitScaleFor(2900)).toBe(0.001);
    expect(unitScaleFor(290)).toBe(0.01);
  });

  it('leaves an empty model alone', () => {
    expect(unitScaleFor(0)).toBe(1);
    expect(unitScaleFor(Number.NaN)).toBe(1);
  });
});

describe('fitDistance', () => {
  it('backs off far enough for the bounding sphere to fill the narrower field of view', () => {
    const wide = fitDistance(1, 45, 2, 1);
    expect(wide).toBeCloseTo(1 / Math.sin((22.5 * Math.PI) / 180), 5);
    const tall = fitDistance(1, 45, 0.5, 1);
    expect(tall).toBeGreaterThan(wide);
  });

  it('adds the margin', () => {
    expect(fitDistance(1, 45, 1, 1.2)).toBeCloseTo(fitDistance(1, 45, 1, 1) * 1.2, 5);
  });
});

describe('isWebGLAvailable', () => {
  const doc = (ctx: unknown) =>
    ({ createElement: () => ({ getContext: () => ctx }) }) as unknown as Pick<Document, 'createElement'>;

  it('is true when a WebGL context can be made', () => {
    expect(isWebGLAvailable(doc({}))).toBe(true);
  });

  it('is false without a context, or when asking throws', () => {
    expect(isWebGLAvailable(doc(null))).toBe(false);
    const throwing = {
      createElement: () => {
        throw new Error('no canvas');
      }
    } as unknown as Pick<Document, 'createElement'>;
    expect(isWebGLAvailable(throwing)).toBe(false);
  });
});

describe('fallbackReasonFor', () => {
  it('maps scene errors to their reason and anything else to init', () => {
    expect(fallbackReasonFor(new CarSceneError('webgl'))).toBe('webgl');
    expect(fallbackReasonFor(new CarSceneError('model'))).toBe('model');
    expect(fallbackReasonFor(new Error('chunk failed'))).toBe('init');
  });
});

describe('view mode storage', () => {
  it('defaults to 3D and reads a stored choice', () => {
    expect(readViewMode(() => ({ getItem: () => null }))).toBe('3d');
    expect(readViewMode(() => ({ getItem: () => '2d' }))).toBe('2d');
    expect(readViewMode(() => ({ getItem: () => 'nonsense' }))).toBe('3d');
  });

  it('survives storage that throws', () => {
    const broken = () => {
      throw new Error('denied');
    };
    expect(readViewMode(broken)).toBe('3d');
    expect(() => writeViewMode(broken, '2d')).not.toThrow();
  });

  it('writes the choice', () => {
    const setItem = vi.fn();
    writeViewMode(() => ({ setItem }), '2d');
    expect(setItem).toHaveBeenCalledWith('shutdown-car-view', '2d');
  });
});

describe('nearestPoint', () => {
  const points = [
    { id: 'a', x: 100, y: 100, visible: true },
    { id: 'b', x: 110, y: 100, visible: true },
    { id: 'c', x: 300, y: 300, visible: false }
  ];

  it('picks the closest visible point within reach', () => {
    expect(nearestPoint(points, 107, 101, 16)).toBe('b');
    expect(nearestPoint(points, 98, 99, 16)).toBe('a');
  });

  it('returns null when nothing is close enough or the nearest is hidden', () => {
    expect(nearestPoint(points, 200, 200, 16)).toBeNull();
    expect(nearestPoint(points, 300, 300, 16)).toBeNull();
  });
});
