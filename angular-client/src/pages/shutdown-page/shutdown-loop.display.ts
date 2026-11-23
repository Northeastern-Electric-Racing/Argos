import { tw } from 'src/ui/recipes/tw';
import { Board, NodeKind } from './shutdown-loop.model';
import { LoopStatus, NodeState, NodeStatus, STALE_AFTER_MS } from './shutdown-loop.utils';

/**
 * Presentation of the shutdown loop: labels, icons, colours and the plain-language explanations shown per node.
 * Presentation only: the status itself comes from computeLoopStatus (shutdown-loop.utils.ts).
 *
 * State is never colour alone: each state has an icon and a label, and measured nodes are filled while unmeasured
 * ones are hollow. Colours (theme tokens): closed success green, the cause danger orange (NER red is the accent),
 * downstream a muted grey, no data a dashed grey.
 */
export interface StateDisplay {
  /** Full label, used in ARIA names and the detail panel. */
  label: string;
  /** Short label under each strip node. */
  short: string;
  /** Material Icons ligature for <ui-icon>. */
  icon: string;
  /** Text colour for the state label. */
  text: string;
  /** Strip and car marker: a filled disc for a measured node, a hollow ring for an unmeasured one. */
  marker: { measured: string; unmeasured: string };
  /** Strip connector after a node in this state (the loop voltage just after it). */
  connector: string;
  /** Car view wiring segment after a node in this state, and its dash pattern (SVG user units = px). */
  stroke: string;
  dash: string | null;
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
    dash: null
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
    dash: null
  },
  'downstream-open': {
    label: 'Open — upstream',
    short: 'Upstream',
    icon: 'remove',
    text: tw('text-fg-muted'),
    marker: {
      measured: tw('border-solid border-fg-dim bg-surface-3 text-fg-label'),
      unmeasured: tw('border-dashed border-fg-dim bg-page text-fg-muted')
    },
    connector: tw('border-dashed border-fg-dim'),
    stroke: tw('stroke-fg-dim'),
    dash: '7 6'
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
    dash: '2 5'
  }
};

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

/** How long ago, for people: "just now", "3 s ago", "1 min 15 s ago". */
export function formatAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 1) return 'just now';
  if (s < 60) return `${s} s ago`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return min < 10 && rest ? `${min} min ${rest} s ago` : `${min} min ago`;
}

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
export const breakNode = (loop: LoopStatus) => loop.suspects.at(-1);

const joinOr = (labels: string[]): string =>
  labels.length <= 1 ? labels[0] ?? '' : `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;

/** One sentence on why a node is in its state, in loop terms. */
export function explainNode(s: NodeStatus, loop: LoopStatus): string {
  const i = loop.nodes.findIndex((n) => n.node.id === s.node.id);
  const measured = !!s.node.topic;
  const brk = breakNode(loop);
  switch (s.state) {
    case 'closed': {
      if (s.node.kind === 'load') return 'Energized: every reading is live and closed.';
      if (measured) return 'Reads 1: 24 V is present just after it.';
      const next = loop.nodes.slice(i + 1).find((n) => n.node.topic && n.state === 'closed');
      if (next) return `No sensor of its own. Inferred closed: ${next.node.label} further along the loop reads 1.`;
      return 'No sensor of its own. Inferred closed: the VCU is publishing, so GLV power is on.';
    }
    case 'suspect': {
      const single = loop.suspects.length === 1 && loop.noDataInStretch.length === 0;
      if (measured && single) return 'Reads 0 while the reading before it is closed: the loop is broken here.';
      if (measured) {
        const others = [
          ...loop.suspects.filter((n) => n.id !== s.node.id).map((n) => n.label),
          ...loop.noDataInStretch.map((n) => `${n.label} (no data)`)
        ];
        const which = others.length === 1 ? 'which has no reading of its own' : 'which have no reading of their own';
        return `Reads 0: the first open reading. The break is here or in ${joinOr(others)}, ${which}.`;
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
      if (s.mismatch) return `Reads 1 (closed) after the break at ${at}: a sensor or wiring mismatch.`;
      if (s.node.kind === 'load') return `De-energized: the loop is open upstream at ${at}.`;
      return `Open because ${at} upstream is open. Not the cause.`;
    }
    case 'no-data': {
      if (!measured) return 'No sensor, and no live reading after it shows voltage, so its state is unknown.';
      const since = s.ageMs === undefined ? 'since the page opened' : `for ${formatAge(s.ageMs).replace(/ ago$/, '')}`;
      const inStretch = loop.noDataInStretch.some((n) => n.id === s.node.id)
        ? ' It sits inside the suspect stretch, so it could be the cause too.'
        : '';
      return `No message from the ${s.node.board} ${since}, so this reading is skipped.${inStretch}`;
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
  stale: boolean;
}

/** When each board last published, from the newest reading among its nodes. */
export function boardFreshness(nodes: readonly NodeStatus[]): BoardFreshness[] {
  return (['VCU', 'BMS'] as const).map((board) => {
    const ages = nodes.filter((n) => n.node.board === board && n.ageMs !== undefined).map((n) => n.ageMs!);
    const ageMs = ages.length ? Math.min(...ages) : undefined;
    return { board, ageMs, stale: ageMs === undefined || ageMs > STALE_AFTER_MS };
  });
}

/** ARIA name for a node, shared by the strip and the car view. */
export function nodeAriaLabel(s: NodeStatus): string {
  const mismatch = s.mismatch ? ', mismatch' : '';
  const sensor = s.node.topic ? '' : ' (no sensor)';
  return `${s.node.label}: ${NODE_STATE_DISPLAY[s.state].label}${mismatch}${sensor}`;
}
