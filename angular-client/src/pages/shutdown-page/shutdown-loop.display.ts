import { tw } from 'src/ui/recipes/tw';
import { Board, NodeKind } from './shutdown-loop.model';
import { CssVarReader, readThemeColour, ThemeColourToken } from './shutdown-loop.theme';
import { LoopStatus, NodeState, NodeStatus, summarizeLoop } from './shutdown-loop.utils';

/**
 * Presentation of the shutdown loop, shared by every view of it (strip, 2D car, 3D car): labels, icons, colours,
 * wire styles and the plain-language explanations shown per loop node. Presentation only: the status itself comes
 * from computeLoopStatus / resolveLoopStatus (logic), which the UI only reads.
 *
 * State is never colour alone: each state has an icon, a label and a wire style (dash + emphasis), and measured
 * loop nodes are filled while unmeasured ones are hollow. Colours are theme tokens (`token`): closed success
 * green, the cause danger orange (NER red is the accent), downstream a dim grey, no data a dashed muted grey.
 * Tailwind views use the class lists; three.js reads the same tokens with readStateColours.
 */
/** How heavily a wire is drawn: the cause strong, closed normal, downstream and no data muted (2D width, 3D radius). */
export type WireEmphasis = 'strong' | 'normal' | 'muted';

export interface StateDisplay {
  /** Default full label, used in ARIA names and the detail panel; stateLabel() refines it for a suspect. */
  label: string;
  /** Default short label under each strip item; shortStateLabel() refines it for a suspect. */
  short: string;
  /** Material Icons ligature for <ui-icon>. */
  icon: string;
  /** Text colour for the state label. */
  text: string;
  /** Strip and car marker: a filled disc for a measured node, a hollow ring for an unmeasured one. */
  marker: { measured: string; unmeasured: string };
  /** Strip connector after a node in this state (the loop voltage just after it). */
  connector: string;
  /** Car view wiring segment after a node in this state (Tailwind, 2D). */
  stroke: string;
  /** The state's theme token; every bg-/border-/stroke- colour above is this token. 3D reads it (readStateColours). */
  token: ThemeColourToken;
  /** Wire dash pattern as an SVG dasharray (user units = px), or null for solid; 3D maps it to dashed tubes. */
  dash: string | null;
  emphasis: WireEmphasis;
}

export const NODE_STATE_DISPLAY: Record<NodeState, StateDisplay> = {
  closed: {
    label: 'Closed',
    short: 'Closed',
    icon: 'check',
    text: tw('text-success'),
    marker: {
      measured: tw('border-solid border-success bg-success text-on-status'),
      unmeasured: tw('border-solid border-success bg-page text-success')
    },
    connector: tw('border-solid border-success'),
    stroke: tw('stroke-success'),
    token: '--color-success',
    dash: null,
    emphasis: 'normal'
  },
  suspect: {
    label: 'Open — cause',
    short: 'Cause',
    icon: 'close',
    text: tw('text-danger'),
    marker: {
      measured: tw('border-solid border-danger bg-danger text-on-status'),
      unmeasured: tw('border-solid border-danger bg-page text-danger')
    },
    connector: tw('border-solid border-danger'),
    stroke: tw('stroke-danger'),
    token: '--color-danger',
    dash: null,
    emphasis: 'strong'
  },
  'downstream-open': {
    label: 'Open — after the break',
    short: 'Downstream',
    icon: 'remove',
    text: tw('text-fg-muted'),
    marker: {
      measured: tw('border-solid border-fg-dim bg-surface-3 text-fg-label'),
      unmeasured: tw('border-dashed border-fg-dim bg-page text-fg-muted')
    },
    connector: tw('border-dashed border-fg-dim'),
    stroke: tw('stroke-fg-dim'),
    token: '--color-fg-dim',
    dash: '7 6',
    emphasis: 'muted'
  },
  'no-data': {
    label: 'No data',
    short: 'No data',
    icon: 'question_mark',
    text: tw('text-fg-muted'),
    marker: {
      measured: tw('border-dashed border-fg-muted bg-surface-2 text-fg-muted'),
      unmeasured: tw('border-dashed border-fg-muted bg-page text-fg-muted')
    },
    connector: tw('border-dotted border-fg-muted'),
    stroke: tw('stroke-fg-muted'),
    token: '--color-fg-muted',
    dash: '2 5',
    emphasis: 'muted'
  }
};

/**
 * 2D wire widths in px per emphasis (M10): the cause a 5 px core over a 9 px casing in the page colour, so it reads
 * as heavier, not only redder; closed a solid 3 px line; downstream and no data 2 px with their dash.
 */
export const WIRE_WIDTH: Record<WireEmphasis, { core: number; casing?: number }> = {
  strong: { core: 5, casing: 9 },
  normal: { core: 3 },
  muted: { core: 2 }
};

/** Each state's colour as `read` resolves its token, for three.js materials: `readStateColours(cssVarReader(root))`. */
export function readStateColours(read: CssVarReader): Record<NodeState, string> {
  const entries = (Object.keys(NODE_STATE_DISPLAY) as NodeState[]).map(
    (state) => [state, readThemeColour(NODE_STATE_DISPLAY[state].token, read)] as const
  );
  return Object.fromEntries(entries) as Record<NodeState, string>;
}

/**
 * The state of wire `i`, from loop node `i` to `i + 1`: the loop voltage just after node `i`, so it takes that
 * node's state, except that the wire after the break (the last suspect) is already open downstream of it.
 */
export function segmentState(nodes: readonly NodeStatus[], i: number): NodeState {
  const { state } = nodes[i];
  if (state !== 'suspect') return state;
  return nodes.slice(i + 1).some((n) => n.state === 'suspect') ? 'suspect' : 'downstream-open';
}

/** What the state labels need from the loop: its suspect stretch. A LoopStatus, or loopOf(nodes) in a view. */
export type LoopStretch = Pick<LoopStatus, 'suspects' | 'noDataInStretch'>;

/**
 * The loop-wide summary of a view's `nodes` input (LoopView gives views the nodes only), for stateLabel and
 * loopSummary. It summarises the states logic decided; it never re-decides them.
 */
export const loopOf = (nodes: readonly NodeStatus[]): Omit<LoopStatus, 'source'> => summarizeLoop([...nodes]);

/** One culprit: a single suspect and no silent reading in its stretch. */
const singleCause = (loop: LoopStretch) => loop.suspects.length === 1 && loop.noDataInStretch.length === 0;

/** The full state label in loop terms: the single cause, a possible cause in a wider stretch, or the default. */
export function stateLabel(s: NodeStatus, loop: LoopStretch): string {
  if (s.state === 'suspect') return singleCause(loop) ? 'Open — cause' : 'Open — possible cause';
  return NODE_STATE_DISPLAY[s.state].label;
}

/** The short state label under a strip item; see stateLabel. A mismatch says what it reads ("Reads 1"). */
export function shortStateLabel(s: NodeStatus, loop: LoopStretch): string {
  if (s.mismatch) return 'Reads 1';
  if (s.state === 'suspect') return singleCause(loop) ? 'Cause' : 'Suspect';
  return NODE_STATE_DISPLAY[s.state].short;
}

/** Tag shown on the energy-meter interlock until it has a reading. */
export const PLACEHOLDER_TAG = 'placeholder — no reading yet';

/** Short names for the strip, as the netmap labels them. Full labels stay in SHUTDOWN_LOOP. */
export const SHORT_LABEL: Readonly<Record<string, string>> = {
  glvms: 'GLVMS',
  'side-brb-r': 'BRB R',
  'side-brb-l': 'BRB L',
  'bms-latch': 'BMS',
  'imd-latch': 'IMD',
  'bspd-latch': 'BSPD',
  'can-latch': 'CAN',
  'mc-hvil': 'MC HVIL',
  bots: 'BOTS',
  inertia: 'Inertia',
  'cockpit-brb': 'Cockpit BRB',
  tsms: 'TSMS',
  hvd: 'HVD',
  'em-interlock': 'EM',
  'acc-sense': 'Acc',
  'tsip-sense': 'TSIP',
  'ts-minus': 'TS−',
  'ts-plus': 'TS+',
  airs: 'AIRs'
};

export const KIND_LABEL: Record<NodeKind, string> = {
  switch: 'Switch',
  kill: 'Kill button',
  latch: 'Latch',
  interlock: 'Interlock',
  sense: 'Sense point',
  load: 'Load (AIR coils)'
};

/** How long ago, for people: "<1 s ago", "3 s ago", "1 min 15 s ago". */
export function formatAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 1) return '<1 s ago';
  if (s < 60) return `${s} s ago`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return min < 10 && rest ? `${min} min ${rest} s ago` : `${min} min ago`;
}

/** A duration, for people: "<1 s", "12 s", "1 min 15 s" (formatAge without "ago"). */
export const formatDuration = (ms: number): string => formatAge(ms).replace(/ ago$/, '');

/** A raw reading with its meaning: 1 = closed (24 V present), 0 = open. */
export function formatValue(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value === 1) return '1 (closed)';
  if (value === 0) return '0 (open)';
  return String(value);
}

export type LoopZone = 'stretch' | 'downstream' | null;
export interface ZoneSlot {
  zone: LoopZone;
  /** First / last node of its zone, where a bracket starts or ends. */
  start: boolean;
  end: boolean;
}

/**
 * Groups the loop for bracketing: the suspect stretch (the suspects, plus any silent readings inside it or just
 * before it, which computeLoopStatus reports as no data) and the downstream run after it.
 */
export function loopZones(nodes: readonly NodeStatus[]): ZoneSlot[] {
  const first = nodes.findIndex((s) => s.state === 'suspect');
  let last = -1;
  nodes.forEach((s, i) => {
    if (s.state === 'suspect') last = i;
  });
  let start = first;
  while (start > 0 && nodes[start - 1].state === 'no-data' && nodes[start - 1].node.topic) start--;
  return nodes.map((_, i) => {
    if (first < 0) return { zone: null, start: false, end: false };
    if (i >= start && i <= last) return { zone: 'stretch', start: i === start, end: i === last };
    if (i > last) return { zone: 'downstream', start: i === last + 1, end: i === nodes.length - 1 };
    return { zone: null, start: false, end: false };
  });
}

/** The first open reading: the last node of the suspect stretch. */
export const breakNode = (loop: Pick<LoopStatus, 'suspects'>) => loop.suspects.at(-1);

const joinOr = (labels: string[]): string =>
  labels.length <= 1 ? labels[0] ?? '' : `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;

const has = (n: number) => (n === 1 ? 'has' : 'have');

/** The value a reading has when it agrees with the loop node's state; undefined when the state claims none. */
function expectedValue(s: NodeStatus): number | undefined {
  switch (s.state) {
    case 'closed':
      return 1;
    case 'suspect':
      return 0;
    case 'downstream-open':
      return s.mismatch ? 1 : 0;
    case 'no-data':
      return undefined;
  }
}

/**
 * Whether this client's latest reading contradicts the state scylla-server decided (LoopStatus.source 'server').
 * The server sees every message, so its state wins; the UI never cites the contradicting value as the reason.
 */
export function contradictsServer(s: NodeStatus, loop: Pick<LoopStatus, 'source'>): boolean {
  const expected = expectedValue(s);
  return loop.source === 'server' && s.value !== undefined && expected !== undefined && s.value !== expected;
}

/** The detail panel's note when scylla-server's state and this client's latest reading disagree. */
export function serverNote(s: NodeStatus, loop: Pick<LoopStatus, 'source'>): string | undefined {
  if (!contradictsServer(s, loop)) return undefined;
  return `Decided by scylla-server, which sees every message; this client's latest reading is ${formatValue(s.value)}.`;
}

/**
 * One sentence on why a loop node is in its state, in loop terms. It reasons from the states logic decided
 * (computeLoopStatus or scylla-server) and cites a reading only when the reading agrees with the state.
 */
export function explainNode(s: NodeStatus, loop: LoopStatus): string {
  const i = loop.nodes.findIndex((n) => n.node.id === s.node.id);
  const measured = !!s.node.topic;
  const cites = measured && !contradictsServer(s, loop);
  const brk = breakNode(loop);
  switch (s.state) {
    case 'closed': {
      if (s.node.kind === 'load') return 'Energized: every reading is live and closed.';
      if (measured) return `${cites ? 'Reads 1' : 'Closed'}: 24 V is present just after it.`;
      const next = loop.nodes.slice(i + 1).find((n) => n.node.topic && n.state === 'closed');
      if (next)
        return `No sensor of its own. Inferred closed: ${next.node.label} further along the loop ${contradictsServer(next, loop) ? 'is closed' : 'reads 1'}.`;
      return 'No sensor of its own. Inferred closed: the VCU is publishing, so GLV power is on.';
    }
    case 'suspect': {
      const reads = cites ? 'Reads 0' : 'Open';
      if (measured && singleCause(loop)) return `${reads} while the reading before it is closed: the loop is broken here.`;
      if (measured) {
        const unmeasured = loop.suspects.filter((n) => n.id !== s.node.id).map((n) => n.label);
        const silent = loop.noDataInStretch.map((n) => n.label);
        const why =
          unmeasured.length && silent.length
            ? ` (${unmeasured.join(', ')}: no sensor; ${silent.join(', ')}: no live reading)`
            : unmeasured.length
              ? `, which ${has(unmeasured.length)} no reading of ${unmeasured.length === 1 ? 'its' : 'their'} own`
              : `, which ${has(silent.length)} no live reading`;
        return `${reads}: the first open reading. The break is here or in ${joinOr([...unmeasured, ...silent])}${why}.`;
      }
      const before = loop.nodes
        .slice(0, i)
        .reverse()
        .find((n) => n.state === 'closed');
      const from = before ? `${before.node.label} (closed)` : 'the loop start';
      return `No sensor. It sits between ${from} and ${brk?.label ?? 'the first open reading'} (open), so it could be the break.`;
    }
    case 'downstream-open': {
      const at = brk?.label ?? 'the break';
      if (s.mismatch)
        return `${cites ? 'Reads 1 (closed)' : 'Closed'} after the break at ${at}: a sensor or wiring mismatch.`;
      if (s.node.kind === 'load') return `De-energized: the loop is open upstream at ${at}.`;
      return `Open because ${at} upstream is open. Not the cause.`;
    }
    case 'no-data': {
      if (!measured) return 'No sensor, and no live reading after it shows voltage, so its state is unknown.';
      const inStretch = loop.noDataInStretch.some((n) => n.id === s.node.id)
        ? ' It sits inside the suspect stretch with no live reading, so it could be the cause too.'
        : '';
      if (s.ageMs === undefined) return `No reading since the page opened, so it is skipped.${inStretch}`;
      const timeout =
        s.staleAfterMs === undefined ? '' : ` (it goes stale after ${formatDuration(s.staleAfterMs)} without one)`;
      return `No new reading for ${formatDuration(s.ageMs)}${timeout}, so it is skipped.${inStretch}`;
    }
  }
}

/** Extra notes under the explanation: placeholders and unmeasured nodes. */
export function nodeNotes(s: NodeStatus): string[] {
  if (s.node.placeholder) return ['Placeholder: no reading yet. Treated like any unmeasured node.'];
  if (!s.node.topic) return ['No sensor: its state is inferred from the readings around it.'];
  return [];
}

export interface BoardFreshness {
  board: Board;
  /** Age of the board's newest reading; undefined if nothing has arrived since the page opened. */
  ageMs?: number;
  /** How many of the board's measured loop nodes are stale (no-data: logic decides). */
  staleCount: number;
  /** Every measured loop node of the board is stale. */
  stale: boolean;
}

/**
 * When each board last published, from the newest reading among its loop nodes, and how many of its measured
 * loop nodes are stale. Staleness is logic's call (a measured loop node in `no-data`): no timeouts here.
 */
export function boardFreshness(nodes: readonly NodeStatus[]): BoardFreshness[] {
  return (['VCU', 'BMS'] as const).map((board) => {
    const measured = nodes.filter((n) => n.node.board === board && n.node.topic);
    const ages = measured.filter((n) => n.ageMs !== undefined).map((n) => n.ageMs!);
    const ageMs = ages.length ? Math.min(...ages) : undefined;
    const staleCount = measured.filter((n) => n.state === 'no-data').length;
    return { board, ageMs, staleCount, stale: measured.length > 0 && staleCount === measured.length };
  });
}

/** ARIA name for a loop node, shared by every view of the loop. */
export function nodeAriaLabel(s: NodeStatus, loop: LoopStretch): string {
  if (s.mismatch) return `${s.node.label}: reads closed after the break — sensor mismatch`;
  const sensor = s.node.topic ? '' : ' (no sensor)';
  return `${s.node.label}: ${stateLabel(s, loop)}${sensor}`;
}

/**
 * The verdict and the break loop node in one sentence, with no warnings or stretch list: the banner's live region
 * and the accessible name of a car view drawn as an image ("LOOP OPEN — cause: TSMS").
 */
export function loopSummary(loop: Pick<LoopStatus, 'verdict' | 'suspects' | 'noDataInStretch' | 'silentBoards'>): string {
  switch (loop.verdict) {
    case 'open': {
      const brk = breakNode(loop);
      if (!brk) return 'LOOP OPEN';
      return singleCause(loop) ? `LOOP OPEN — cause: ${brk.label}` : `LOOP OPEN — cause at or before ${brk.label}`;
    }
    case 'closed':
      return 'LOOP CLOSED · AIRs on';
    case 'unknown':
      return loop.silentBoards.length ? `UNKNOWN — no data from ${loop.silentBoards.join(' and ')}` : 'UNKNOWN';
  }
}
