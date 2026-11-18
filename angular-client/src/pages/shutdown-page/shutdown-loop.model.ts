import { SHUTDOWN_TOPICS } from './shutdown-page.topics';

export type Board = 'VCU' | 'BMS';
export type NodeKind = 'source' | 'switch' | 'kill' | 'latch' | 'interlock' | 'sense' | 'load';

export interface LoopNode {
  /** Stable kebab-case id. */
  id: string;
  label: string;
  kind: NodeKind;
  /** Reading of the loop voltage just after this node. Absent = unmeasured. */
  topic?: string;
  /** Board that publishes `topic`; present iff `topic` is. */
  board?: Board;
  /** True only for nodes with no reading yet that stand in for real hardware. */
  placeholder?: boolean;
  /** Position on the car side-view drawing, as % of its width / height (0–100). */
  car: { x: number; y: number };
}

const { VCU, BMS } = SHUTDOWN_TOPICS;

/** The shutdown loop in series order, from GLV source to the AIR coils. */
export const SHUTDOWN_LOOP: readonly LoopNode[] = [
  { id: 'glvms', label: 'GLV master switch', kind: 'switch', car: { x: 50, y: 30 } },
  { id: 'vcu', label: 'VCU', kind: 'source', car: { x: 55, y: 52 } },
  { id: 'side-brb-r', label: 'Side BRB R', kind: 'kill', car: { x: 58, y: 22 } },
  { id: 'side-brb-l', label: 'Side BRB L', kind: 'kill', car: { x: 60, y: 30 } },
  { id: 'bms-latch', label: 'BMS latch', kind: 'latch', topic: VCU.BMS, board: 'VCU', car: { x: 50, y: 58 } },
  { id: 'imd-latch', label: 'IMD latch', kind: 'latch', topic: VCU.IMD, board: 'VCU', car: { x: 53, y: 62 } },
  { id: 'bspd-latch', label: 'BSPD latch', kind: 'latch', topic: VCU.BSPD, board: 'VCU', car: { x: 56, y: 62 } },
  { id: 'mc-hvil', label: 'MC HVIL interlock', kind: 'interlock', topic: VCU.HV_C, board: 'VCU', car: { x: 76, y: 42 } },
  { id: 'bots', label: 'BOTS', kind: 'switch', topic: VCU.BOTS, board: 'VCU', car: { x: 16, y: 68 } },
  { id: 'inertia', label: 'Inertia switch', kind: 'switch', topic: VCU.INERTIA_SW, board: 'VCU', car: { x: 30, y: 50 } },
  { id: 'cockpit-brb', label: 'Cockpit BRB', kind: 'kill', topic: VCU.CKPT, board: 'VCU', car: { x: 34, y: 40 } },
  { id: 'tsms', label: 'TSMS', kind: 'switch', topic: VCU.TSMS, board: 'VCU', car: { x: 48, y: 38 } },
  { id: 'hvd', label: 'HVD', kind: 'interlock', topic: VCU.HVD, board: 'VCU', car: { x: 76, y: 56 } },
  { id: 'em-interlock', label: 'Energy meter interlock', kind: 'interlock', placeholder: true, car: { x: 72, y: 64 } },
  { id: 'acc-sense', label: 'Accumulator sense', kind: 'sense', topic: BMS.Acc, board: 'BMS', car: { x: 62, y: 72 } },
  { id: 'tsip-sense', label: 'TSIP sense', kind: 'sense', topic: BMS.TSIP, board: 'BMS', car: { x: 78, y: 66 } },
  { id: 'ts-minus', label: 'TS− sense', kind: 'sense', topic: BMS.TS_Minus, board: 'BMS', car: { x: 64, y: 78 } },
  { id: 'ts-plus', label: 'TS+ sense', kind: 'sense', topic: BMS.TS_Plus, board: 'BMS', car: { x: 68, y: 78 } },
  { id: 'airs', label: 'AIRs', kind: 'load', car: { x: 66, y: 68 } }
];
