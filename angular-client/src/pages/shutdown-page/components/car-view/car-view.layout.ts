/**
 * Where each loop node's interactive badge sits on the 2D car drawing, in the same frame as `LoopNode.car`
 * (% of the drawing's width and height, nose left). The anchor dot stays at `LoopNode.car`, where the part really
 * is; a badge that sits elsewhere is joined to it by a leader line. Loop nodes that cluster on the car (the side
 * BRBs, GLVMS and TSMS, the four latches, the inertia switch and cockpit BRB, the sense row and the AIRs) fan
 * out, so that at the `sm` breakpoint's 600 x 321 px drawing every pair of badge centres is at least 28 px
 * apart (a size-7 badge each, no overlap; car-view.layout.spec.ts checks it). The rest sit on their anchor.
 */
export const CAR_BADGE_2D: Readonly<Record<string, { x: number; y: number }>> = {
  // Main hoop: the GLV master switch and TSMS share a bracket; the side BRBs sit above them.
  glvms: { x: 76, y: 36 },
  tsms: { x: 64, y: 36 },
  'side-brb-r': { x: 72, y: 16 },
  'side-brb-l': { x: 62, y: 16 },
  // The latch board, fanned into a row below it.
  'bms-latch': { x: 46, y: 60 },
  'imd-latch': { x: 52, y: 60 },
  'bspd-latch': { x: 58, y: 60 },
  'can-latch': { x: 64, y: 60 },
  'mc-hvil': { x: 80.3, y: 74.3 },
  bots: { x: 7.4, y: 82.3 },
  // Cockpit: the inertia switch and the cockpit BRB sit side by side on the dash.
  inertia: { x: 28, y: 34 },
  'cockpit-brb': { x: 38, y: 34 },
  hvd: { x: 72.1, y: 63.7 },
  'em-interlock': { x: 76, y: 53 },
  // The accumulator's sense row and the AIRs, fanned into a row below the pack.
  'acc-sense': { x: 56, y: 91 },
  'tsip-sense': { x: 62, y: 91 },
  'ts-minus': { x: 68, y: 91 },
  'ts-plus': { x: 74, y: 91 },
  airs: { x: 80, y: 91 }
};

/** The drawing's size at the `sm` breakpoint, where badges are closest: the spacing spec measures there. */
export const CAR_DRAWING_SM_PX = { width: 600, height: 321 } as const;
/** A badge's diameter (size-7) and so the least distance between two badge centres. */
export const CAR_BADGE_PX = 28;
