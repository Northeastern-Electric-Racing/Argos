import { SHUTDOWN_TOPICS } from './shutdown-page.topics';

export type Board = 'VCU' | 'BMS';
export type NodeKind = 'switch' | 'kill' | 'latch' | 'interlock' | 'sense' | 'load';

export interface LoopNode {
  /** Stable kebab-case id. */
  id: string;
  label: string;
  kind: NodeKind;
  /** Reading of the loop voltage just after this node. Absent = unmeasured. */
  topic?: string;
  /** Board that publishes `topic`; present iff `topic` is. */
  board?: Board;
  /**
   * The reading can only show this node open (the CAN latch: its faults say whether one is tripped,
   * not whether there is loop voltage after it). It is a measurement point only while it reads 0;
   * otherwise the node is treated as unmeasured.
   */
  openOnly?: true;
  /** True only for nodes with no reading yet that stand in for real hardware. */
  placeholder?: boolean;
  /** Position on the car side-view drawing, as % of its width / height (0–100). */
  car: { x: number; y: number };
}

const { VCU, BMS } = SHUTDOWN_TOPICS;

/**
 * The shutdown loop in series order, from GLV source to the AIR coils.
 * Parsed by scylla-server's `matches_the_angular_client_loop` test: keep one `id:` per entry and
 * topics as `VCU.X`/`BMS.X`.
 */
export const SHUTDOWN_LOOP: readonly LoopNode[] = [
  { id: 'glvms', label: 'GLV master switch', kind: 'switch', car: { x: 71.2, y: 38.7 } },
  { id: 'side-brb-r', label: 'Side BRB R', kind: 'kill', car: { x: 67.8, y: 26.5 } },
  { id: 'side-brb-l', label: 'Side BRB L', kind: 'kill', car: { x: 64.6, y: 26.5 } },
  { id: 'bms-latch', label: 'BMS latch', kind: 'latch', topic: VCU.BMS, board: 'VCU', car: { x: 58.7, y: 48.3 } },
  { id: 'imd-latch', label: 'IMD latch', kind: 'latch', topic: VCU.IMD, board: 'VCU', car: { x: 61.6, y: 48.3 } },
  { id: 'bspd-latch', label: 'BSPD latch', kind: 'latch', topic: VCU.BSPD, board: 'VCU', car: { x: 64.4, y: 48.8 } },
  {
    id: 'can-latch',
    label: 'CAN latch',
    kind: 'latch',
    topic: VCU.CAN_LATCH,
    board: 'VCU',
    openOnly: true,
    car: { x: 67.2, y: 48.8 }
  },
  { id: 'mc-hvil', label: 'MC HVIL interlock', kind: 'interlock', topic: VCU.HV_C, board: 'VCU', car: { x: 80.3, y: 74.3 } },
  { id: 'bots', label: 'BOTS', kind: 'switch', topic: VCU.BOTS, board: 'VCU', car: { x: 7.4, y: 82.3 } },
  { id: 'inertia', label: 'Inertia switch', kind: 'switch', topic: VCU.INERTIA_SW, board: 'VCU', car: { x: 31.5, y: 43.5 } },
  { id: 'cockpit-brb', label: 'Cockpit BRB', kind: 'kill', topic: VCU.CKPT, board: 'VCU', car: { x: 34.7, y: 43.5 } },
  { id: 'tsms', label: 'TSMS', kind: 'switch', topic: VCU.TSMS, board: 'VCU', car: { x: 67, y: 38.6 } },
  { id: 'hvd', label: 'HVD', kind: 'interlock', topic: VCU.HVD, board: 'VCU', car: { x: 72.1, y: 63.7 } },
  { id: 'em-interlock', label: 'Energy meter interlock', kind: 'interlock', placeholder: true, car: { x: 73.2, y: 54.7 } },
  { id: 'acc-sense', label: 'Accumulator sense', kind: 'sense', topic: BMS.Acc, board: 'BMS', car: { x: 64, y: 76.5 } },
  { id: 'tsip-sense', label: 'TSIP sense', kind: 'sense', topic: BMS.TSIP, board: 'BMS', car: { x: 67.2, y: 76.5 } },
  { id: 'ts-minus', label: 'TS− sense', kind: 'sense', topic: BMS.TS_Minus, board: 'BMS', car: { x: 70.4, y: 76.5 } },
  { id: 'ts-plus', label: 'TS+ sense', kind: 'sense', topic: BMS.TS_Plus, board: 'BMS', car: { x: 73.6, y: 76.5 } },
  { id: 'airs', label: 'AIRs', kind: 'load', car: { x: 76.8, y: 76.5 } }
];
