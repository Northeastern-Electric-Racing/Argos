import { InputSignal, OutputEmitterRef } from '@angular/core';
import { NodeStatus } from '../shutdown-loop.utils';

/**
 * Every view of the shutdown loop implements this: the loop strip, the 2D car and any 3D car. "Node" in these
 * member names means loop node. The page binds each view to ShutdownSelectionStore exactly once.
 *
 * Rules:
 * 1. A view never owns selection (no `selectedId = signal()`); it highlights `previewId() ?? selectedId()`.
 * 2. Click, tap, Enter or Space on a loop node toggles the pin: `nodeSelect.emit(id === selectedId() ? null : id)`.
 *    Escape emits null. Hover emits `nodePreview(id)`, leaving emits `nodePreview(null)`. Focus alone never selects.
 * 3. DOM views are a listbox: one option per loop node (`role="option"`, `data-node-id`, `aria-selected`), one tab stop.
 * 4. 3D views leave keyboard and assistive-tech access to the strip: the canvas wrapper is `role="img"` labelled with
 *    loopSummary(); HTML badges are `aria-hidden` and take pointer clicks only; a pick toggles (rule 2), hover
 *    previews; the camera follows `selectedId` in an effect.
 * 5. loop-node-detail is the only detail panel; views show none of their own.
 * Every LoopView spec runs expectLoopViewContract (loop-view.contract.ts).
 */
export interface LoopView {
  /** LoopStatus.nodes, in loop order. */
  readonly nodes: InputSignal<NodeStatus[]>;
  readonly selectedId: InputSignal<string | null>;
  readonly previewId: InputSignal<string | null>;
  /** The toggled pin: an id, or null to clear. */
  readonly nodeSelect: OutputEmitterRef<string | null>;
  /** The hovered or keyboard-active id; null on leave. */
  readonly nodePreview: OutputEmitterRef<string | null>;
}

/** Car views only (2D and 3D). False below `sm`: an overview, not a control (no picking, no tab stops). */
export interface CarLoopView extends LoopView {
  readonly interactive: InputSignal<boolean>;
}
