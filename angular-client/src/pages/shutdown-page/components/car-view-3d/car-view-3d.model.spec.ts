import { NODE_STATE_DISPLAY } from '../../shutdown-loop.display';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NODE_POSITIONS_3D } from '../../shutdown-loop.positions-3d';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import {
  buildLoopSegments,
  buildMarkers,
  dashPieces,
  isWebGLAvailable,
  MARKER_SHAPE,
  nodeInfo,
  sceneSignature
} from './car-view-3d.model';

const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const statusAt = (i: number): NodeState => (i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => ({
  node,
  state: statusAt(i),
  value: node.topic ? (i < TSMS ? 1 : 0) : undefined,
  ageMs: node.topic ? 3000 : undefined,
  mismatch: false
}));

describe('buildLoopSegments', () => {
  const segments = buildLoopSegments(NODES, NODE_POSITIONS_3D);

  it('joins every node to the next in series order', () => {
    expect(segments.length).toBe(SHUTDOWN_LOOP.length - 1);
    expect(segments[0].key).toBe('glvms-side-brb-r');
    expect(segments.at(-1)!.key).toBe('ts-plus-airs');
    segments.forEach((s, i) => {
      expect(s.from).toEqual(NODE_POSITIONS_3D[SHUTDOWN_LOOP[i].id]);
      expect(s.to).toEqual(NODE_POSITIONS_3D[SHUTDOWN_LOOP[i + 1].id]);
    });
  });

  it('colours each segment by the state of the node it leaves, as the 2D view does', () => {
    segments.forEach((s, i) => {
      expect(s.state).toBe(NODES[i].state);
      expect(s.cssClass).toBe(NODE_STATE_DISPLAY[NODES[i].state].cssClass);
    });
    expect(segments[TSMS].state).toBe('suspect');
    expect(segments[TSMS - 1].state).toBe('closed');
  });

  it('dashes segments that carry no current (downstream-open and no data), never live ones', () => {
    const dashed = (state: NodeState) => segments.filter((s) => s.state === state).every((s) => s.dashed);
    expect(dashed('downstream-open')).toBe(true);
    expect(segments.filter((s) => s.state === 'closed' || s.state === 'suspect').some((s) => s.dashed)).toBe(false);
    const noData = buildLoopSegments(
      NODES.map((n) => ({ ...n, state: 'no-data' as const })),
      NODE_POSITIONS_3D
    );
    expect(noData.every((s) => s.dashed)).toBe(true);
  });

  it('skips a segment whose end has no position', () => {
    const withoutHvd = Object.fromEntries(Object.entries(NODE_POSITIONS_3D).filter(([id]) => id !== 'hvd'));
    expect(buildLoopSegments(NODES, withoutHvd).map((s) => s.key)).not.toContain('tsms-hvd');
    expect(buildLoopSegments(NODES, withoutHvd).map((s) => s.key)).not.toContain('hvd-em-interlock');
  });
});

describe('buildMarkers', () => {
  const markers = buildMarkers(NODES, NODE_POSITIONS_3D);

  it('gives each node a marker at its position, numbered in loop order', () => {
    expect(markers.length).toBe(SHUTDOWN_LOOP.length);
    expect(markers[0]).toMatchObject({ id: 'glvms', order: 1, position: NODE_POSITIONS_3D['glvms'] });
    expect(markers.at(-1)!.order).toBe(SHUTDOWN_LOOP.length);
  });

  it('draws unmeasured nodes hollow and measured ones solid', () => {
    expect(markers.find((m) => m.id === 'glvms')!.hollow).toBe(true);
    expect(markers.find((m) => m.id === 'tsms')!.hollow).toBe(false);
  });

  it('gives each state its own shape, so state never relies on colour alone', () => {
    expect(new Set(Object.values(MARKER_SHAPE)).size).toBe(4);
    expect(markers.find((m) => m.id === 'tsms')!.shape).toBe(MARKER_SHAPE.suspect);
    expect(markers.find((m) => m.id === 'glvms')!.shape).toBe(MARKER_SHAPE.closed);
    expect(markers.find((m) => m.id === 'airs')!.shape).toBe(MARKER_SHAPE['downstream-open']);
  });
});

describe('dashPieces', () => {
  it('splits a line into dashes that stay on it and never pass its end', () => {
    const from = { x: 0, y: 0, z: 0 };
    const to = { x: 1, y: 0, z: 0 };
    const pieces = dashPieces(from, to, 0.1, 0.05);
    expect(pieces.length).toBe(7);
    expect(pieces[0]).toEqual([from, { x: 0.1, y: 0, z: 0 }]);
    expect(pieces.at(-1)![1].x).toBeCloseTo(1);
    for (const [a, b] of pieces) {
      expect(b.x).toBeGreaterThan(a.x);
      expect(a.y).toBe(0);
    }
  });

  it('returns nothing for a zero-length line', () => {
    const p = { x: 1, y: 1, z: 1 };
    expect(dashPieces(p, p, 0.1, 0.05)).toEqual([]);
  });
});

describe('nodeInfo', () => {
  it('lists label, state, topic, value and age of a measured node', () => {
    expect(nodeInfo(NODES[TSMS], TSMS + 1)).toEqual({
      id: 'tsms',
      order: TSMS + 1,
      label: 'TSMS',
      state: 'Open — cause',
      topic: 'VCU/Shutdown/TSMS_GPIO',
      value: '0',
      age: '3 s ago',
      notes: []
    });
  });

  it('says an unmeasured node has no sensor and tags the placeholder', () => {
    const em = NODES.find((n) => n.node.id === 'em-interlock')!;
    expect(nodeInfo(em)).toMatchObject({ topic: 'no sensor', value: '—', age: '—' });
    expect(nodeInfo(em).notes).toContain('placeholder — no reading yet');
  });

  it('shows no data for a silent measured node and flags a mismatch', () => {
    const hvd = NODES.find((n) => n.node.id === 'hvd')!;
    expect(nodeInfo({ ...hvd, state: 'no-data', value: undefined, ageMs: undefined })).toMatchObject({
      value: 'no data',
      age: '—'
    });
    expect(nodeInfo({ ...hvd, value: 1, mismatch: true }).notes).toContain('mismatch: reads closed after the break');
  });
});

describe('sceneSignature', () => {
  it('changes only when a state or mismatch changes, not when ages tick', () => {
    const aged = NODES.map((n) => ({ ...n, ageMs: (n.ageMs ?? 0) + 1000 }));
    expect(sceneSignature(aged)).toBe(sceneSignature(NODES));
    const moved = NODES.map((n, i) => (i === 0 ? { ...n, state: 'suspect' as const } : n));
    expect(sceneSignature(moved)).not.toBe(sceneSignature(NODES));
    const flagged = NODES.map((n, i) => (i === TSMS + 1 ? { ...n, mismatch: true } : n));
    expect(sceneSignature(flagged)).not.toBe(sceneSignature(NODES));
  });
});

describe('isWebGLAvailable', () => {
  const docWith = (getContext: (id: string) => unknown) =>
    ({ createElement: () => ({ getContext }) }) as unknown as Document;

  it('is true when a WebGL 2 or WebGL context can be created', () => {
    expect(isWebGLAvailable(docWith((id) => (id === 'webgl2' ? {} : null)))).toBe(true);
    expect(isWebGLAvailable(docWith((id) => (id === 'webgl' ? {} : null)))).toBe(true);
  });

  it('is false when no context can be created or creating one throws', () => {
    expect(isWebGLAvailable(docWith(() => null))).toBe(false);
    expect(
      isWebGLAvailable(
        docWith(() => {
          throw new Error('blocked');
        })
      )
    ).toBe(false);
  });

  it('is false in jsdom, which has no WebGL', () => {
    expect(isWebGLAvailable(document)).toBe(false);
  });
});
