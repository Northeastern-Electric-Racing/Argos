import { NODE_STATE_DISPLAY, segmentState } from '../../shutdown-loop.display';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NODE_POSITIONS_3D } from '../../shutdown-loop.positions-3d';
import { CssVarReader } from '../../shutdown-loop.theme';
import { NodeState, NodeStatus } from '../../shutdown-loop.utils';
import {
  badgeModels,
  buildLoopSegments,
  buildMarkers,
  dashPieces,
  isWebGLAvailable,
  MARKER_SHAPE,
  readSceneColours,
  RenderLoop,
  SCENE_COLOR_TOKENS,
  sceneSignature,
  WIRE_RADIUS
} from './car-view-3d.utils';

const ids = SHUTDOWN_LOOP.map((n) => n.id);
const at = (id: string) => ids.indexOf(id);

/** A loop whose states are given per id; every other node is closed before the first given one, else downstream. */
function loop(states: Record<string, NodeState>, mismatch: string[] = []): NodeStatus[] {
  const first = Math.min(...Object.keys(states).map(at));
  return SHUTDOWN_LOOP.map((node, i) => ({
    node,
    state: states[node.id] ?? (i < first ? 'closed' : 'downstream-open'),
    value: node.topic ? 1 : undefined,
    ageMs: node.topic ? 1000 : undefined,
    mismatch: mismatch.includes(node.id)
  }));
}
const segmentInto = (nodes: NodeStatus[], id: string) =>
  buildLoopSegments(nodes, NODE_POSITIONS_3D).find((s) => s.key.endsWith(`-${id}`) && s.key.startsWith(ids[at(id) - 1]))!;
const segmentFrom = (nodes: NodeStatus[], id: string) =>
  buildLoopSegments(nodes, NODE_POSITIONS_3D).find((s) => s.key === `${id}-${ids[at(id) + 1]}`)!;

describe('buildLoopSegments', () => {
  const tsmsBreak = loop({ tsms: 'suspect' });

  it('joins every loop node to the next in series order', () => {
    const segments = buildLoopSegments(tsmsBreak, NODE_POSITIONS_3D);
    expect(segments.length).toBe(SHUTDOWN_LOOP.length - 1);
    expect(segments[0]).toMatchObject({ key: 'glvms-side-brb-r', from: NODE_POSITIONS_3D['glvms'] });
    expect(segments.at(-1)!.key).toBe('ts-plus-airs');
  });

  it('takes each wire’s state from segmentState, the helper every view shares', () => {
    for (const nodes of [tsmsBreak, loop({ 'bms-latch': 'suspect', 'imd-latch': 'suspect' }), loop({ hvd: 'no-data' })]) {
      buildLoopSegments(nodes, NODE_POSITIONS_3D).forEach((s, i) => expect(s.state, s.key).toBe(segmentState(nodes, i)));
    }
  });

  it('single break (TSMS): the wire into TSMS is closed and the wire out of it is dashed downstream', () => {
    expect(segmentInto(tsmsBreak, 'tsms').state).toBe('closed');
    expect(segmentFrom(tsmsBreak, 'tsms')).toMatchObject({ state: 'downstream-open', emphasis: 'muted' });
    expect(segmentFrom(tsmsBreak, 'tsms').dash).not.toBeNull();
  });

  it('a stretch P, S1, F: the wires inside it are the strong cause wire, the wire after F is downstream', () => {
    const nodes = loop({ 'bms-latch': 'suspect', 'imd-latch': 'suspect', 'bspd-latch': 'suspect' });
    expect(segmentFrom(nodes, 'bms-latch')).toMatchObject({ state: 'suspect', emphasis: 'strong', dash: null });
    expect(segmentFrom(nodes, 'imd-latch')).toMatchObject({ state: 'suspect', emphasis: 'strong' });
    expect(segmentFrom(nodes, 'bspd-latch').state).toBe('downstream-open');
  });

  it('draws the cause wire at twice the normal radius and muted wires thinner', () => {
    expect(WIRE_RADIUS.strong).toBeCloseTo(WIRE_RADIUS.normal * 2);
    expect(WIRE_RADIUS.muted).toBeLessThan(WIRE_RADIUS.normal);
  });

  it('closed loop: every wire solid; a wire into a trailing no-data node is still solid, out of one dotted', () => {
    const closed = loop({ glvms: 'closed' }).map((s) => ({ ...s, state: 'closed' as const }));
    expect(buildLoopSegments(closed, NODE_POSITIONS_3D).every((s) => s.dash === null && s.state === 'closed')).toBe(true);
    const trailing = closed.map((s) => (s.node.id === 'ts-plus' ? { ...s, state: 'no-data' as const } : s));
    expect(segmentFrom(trailing, 'ts-plus').state).toBe('no-data');
    expect(segmentFrom(trailing, 'ts-plus').dash).toEqual(dashOf('no-data'));
  });

  it('maps the UI dash patterns to two clearly different piece lengths: dashed downstream, dotted no data', () => {
    const [dDash, dGap] = dashOf('downstream-open')!;
    const [nDash, nGap] = dashOf('no-data')!;
    expect(dDash).toBeGreaterThan(nDash * 2);
    expect(nGap).toBeGreaterThan(nDash);
    expect(dGap).toBeGreaterThan(0);
  });

  it('skips a wire whose end has no position', () => {
    const withoutHvd = Object.fromEntries(Object.entries(NODE_POSITIONS_3D).filter(([id]) => id !== 'hvd'));
    const keys = buildLoopSegments(tsmsBreak, withoutHvd).map((s) => s.key);
    expect(keys).not.toContain('tsms-hvd');
    expect(keys).not.toContain('hvd-em-interlock');
  });
});

/** The 3D dash and gap (metres) a state's wire gets. */
function dashOf(state: NodeState) {
  const nodes = loop({ tsms: 'suspect' }).map((s) => ({ ...s, state }));
  return buildLoopSegments(nodes, NODE_POSITIONS_3D)[0].dash;
}

describe('buildMarkers', () => {
  const markers = buildMarkers(loop({ tsms: 'suspect' }), NODE_POSITIONS_3D);

  it('gives each loop node a marker at its position, numbered in loop order', () => {
    expect(markers.length).toBe(SHUTDOWN_LOOP.length);
    expect(markers[0]).toMatchObject({ id: 'glvms', order: 1, position: NODE_POSITIONS_3D['glvms'] });
  });

  it('draws unmeasured loop nodes hollow and gives each state its own shape', () => {
    expect(markers.find((m) => m.id === 'glvms')!.hollow).toBe(true);
    expect(markers.find((m) => m.id === 'tsms')).toMatchObject({ hollow: false, shape: MARKER_SHAPE.suspect });
    expect(new Set(Object.values(MARKER_SHAPE)).size).toBe(4);
  });
});

describe('dashPieces', () => {
  it('splits a line into dashes and gaps, the last dash clipped to the end', () => {
    const pieces = dashPieces([0, 0, 0], [1, 0, 0], 0.3, 0.2);
    expect(pieces.length).toBe(2);
    expect(pieces[0][1][0]).toBeCloseTo(0.3);
    expect(pieces[1][0][0]).toBeCloseTo(0.5);
    expect(pieces[1][1][0]).toBeCloseTo(0.8);
    expect(dashPieces([0, 0, 0], [0, 0, 0], 0.3, 0.2)).toEqual([]);
  });
});

describe('sceneSignature', () => {
  it('changes with a state or a mismatch, not with ages or values ticking', () => {
    const nodes = loop({ tsms: 'suspect' });
    const sig = sceneSignature(nodes);
    expect(sceneSignature(nodes.map((s) => ({ ...s, ageMs: (s.ageMs ?? 0) + 5000, value: 0 })))).toBe(sig);
    expect(sceneSignature(loop({ hvd: 'suspect' }))).not.toBe(sig);
    expect(sceneSignature(loop({ tsms: 'suspect' }, ['airs']))).not.toBe(sig);
  });
});

describe('badgeModels', () => {
  const nodes = loop({ tsms: 'suspect' }, ['ts-plus']);

  it('gives every loop node a badge with its order and state glyph', () => {
    const badges = badgeModels(nodes, null);
    expect(badges.map((b) => b.id)).toEqual(ids);
    expect(badges[0]).toMatchObject({ order: 1, icon: NODE_STATE_DISPLAY.closed.icon, text: '1' });
  });

  it('names the suspect and the highlighted loop node ("12 TSMS"), and marks the suspect', () => {
    const badges = badgeModels(nodes, 'bots');
    const tsms = badges.find((b) => b.id === 'tsms')!;
    expect(tsms).toMatchObject({ suspect: true, text: `${at('tsms') + 1} TSMS`, icon: 'close' });
    expect(badges.find((b) => b.id === 'bots')!).toMatchObject({ highlighted: true, text: `${at('bots') + 1} BOTS` });
    expect(badges.find((b) => b.id === 'hvd')!.text).toBe(String(at('hvd') + 1));
    expect(tsms.width).toBeGreaterThan(badges.find((b) => b.id === 'hvd')!.width);
  });

  it('flags a mismatch, with the shared accessible name in the title', () => {
    const tsPlus = badgeModels(nodes, null).find((b) => b.id === 'ts-plus')!;
    expect(tsPlus.mismatch).toBe(true);
    expect(tsPlus.title).toContain('mismatch');
  });
});

describe('readSceneColours', () => {
  it('reads every state colour and scene colour from theme tokens, HV never from the cause colour', () => {
    const read: CssVarReader = (token) => `rgb(${token.length}, 0, 0)`;
    const colours = readSceneColours(read);
    expect(colours.states.suspect).toBe(read(NODE_STATE_DISPLAY.suspect.token));
    expect(colours.states.closed).toBe(read('--color-success'));
    expect(colours.frame).toBe(read(SCENE_COLOR_TOKENS.frame));
    expect(SCENE_COLOR_TOKENS.hv).toBe('--color-secondary-border');
    expect(Object.values(SCENE_COLOR_TOKENS)).not.toContain('--color-danger');
  });
});

describe('isWebGLAvailable', () => {
  it('reports a context and releases its probe', () => {
    const loseContext = vi.fn();
    const doc = {
      createElement: () => ({ getContext: () => ({ getExtension: () => ({ loseContext }) }) })
    } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('is false when no context can be made or creating one throws', () => {
    expect(isWebGLAvailable({ createElement: () => ({ getContext: () => null }) } as unknown as Document)).toBe(false);
    const throws = {
      createElement: () => {
        throw new Error('no canvas');
      }
    } as unknown as Document;
    expect(isWebGLAvailable(throws)).toBe(false);
  });
});

describe('RenderLoop', () => {
  /** A fake requestAnimationFrame: frames run only when the test flushes them. */
  function fakeRaf() {
    let queue: FrameRequestCallback[] = [];
    let now = 0;
    return {
      raf: (cb: FrameRequestCallback) => queue.push(cb),
      caf: () => (queue = []),
      flush(frames = 1) {
        for (let i = 0; i < frames && queue.length; i++) {
          const run = queue;
          queue = [];
          now += 16;
          run.forEach((cb) => cb(now));
        }
      },
      get pending() {
        return queue.length;
      }
    };
  }

  it('coalesces requests into one frame and stops when nothing is moving', () => {
    const f = fakeRaf();
    const step = vi.fn(() => false);
    const loopRender = new RenderLoop(step, f.raf, f.caf);
    loopRender.request();
    loopRender.request();
    f.flush(5);
    expect(step).toHaveBeenCalledOnce();
    expect(loopRender.frames).toBe(1);
    expect(f.pending).toBe(0);
  });

  it('keeps rendering while a tween or damping runs, then stops with suspects present (no pulse)', () => {
    const f = fakeRaf();
    let moving = 10;
    const loopRender = new RenderLoop(() => moving-- > 0, f.raf, f.caf);
    loopRender.request();
    f.flush(100);
    expect(loopRender.frames).toBe(11);
    expect(f.pending).toBe(0);
  });

  it('never runs a frame after dispose', () => {
    const f = fakeRaf();
    const step = vi.fn(() => true);
    const loopRender = new RenderLoop(step, f.raf, f.caf);
    loopRender.request();
    loopRender.dispose();
    loopRender.request();
    f.flush(3);
    expect(step).not.toHaveBeenCalled();
  });
});
