import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiIconButtonDirective } from 'src/ui/button/button.directive';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from 'src/ui/recipes/tw';
import {
  breakNode,
  explainNode,
  formatAge,
  formatValue,
  KIND_LABEL,
  NODE_STATE_DISPLAY,
  nodeNotes,
  serverNote,
  stateLabel,
  WIRE_WIDTH
} from '../../shutdown-loop.display';
import { LoopStatus, NodeState } from '../../shutdown-loop.utils';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

const discBase = tw('grid size-10 shrink-0 place-items-center rounded-full border-3');
const keyDisc = tw('grid size-6 shrink-0 place-items-center rounded-full border-2');

/** One row of the key per state: its disc, glyph and wire, as every view draws them. */
const LEGEND = (Object.keys(NODE_STATE_DISPLAY) as NodeState[]).map((state) => {
  const d = NODE_STATE_DISPLAY[state];
  const w = WIRE_WIDTH[d.emphasis];
  const label = state === 'suspect' ? 'Open — the cause, or could be' : d.label;
  return {
    state,
    label,
    disc: cx(keyDisc, d.marker.measured),
    stroke: d.stroke,
    dash: d.dash,
    width: w.core,
    casing: w.casing
  };
});

/**
 * Details of one loop node: what it is, its raw reading and age, and why it is in its state in loop terms. Shows
 * the loop node given (the page's active one, ShutdownSelectionStore.activeId), else the break while the loop is
 * open, else a key to the page. While a loop node is pinned, a button unpins it to go back to the break. The
 * page's only detail panel: no view of the loop shows one of its own. When scylla-server decided the states and
 * this client's reading disagrees, a note says so (serverNote).
 */
@Component({
  selector: 'loop-node-detail',
  templateUrl: './loop-node-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [StatusGlyphComponent, UiIconComponent, UiIconButtonDirective]
})
export class LoopNodeDetailComponent {
  status = input.required<LoopStatus>();
  nodeId = input<string | null>(null);
  /** The pinned loop node (ShutdownSelectionStore.selectedId), if any: shows the unpin button. */
  pinnedId = input<string | null>(null);
  /** Unpin: the page calls ShutdownSelectionStore.select(null). */
  unpin = output<void>();

  protected readonly legend = LEGEND;
  protected readonly measuredKey = cx(keyDisc, NODE_STATE_DISPLAY.closed.marker.measured);
  protected readonly unmeasuredKey = cx(keyDisc, NODE_STATE_DISPLAY.closed.marker.unmeasured);

  protected readonly unpinLabel = computed(() => (breakNode(this.status()) ? 'Show the break' : 'Clear the selection'));

  protected readonly detail = computed(() => {
    const loop = this.status();
    const id = this.nodeId() ?? breakNode(loop)?.id;
    const index = loop.nodes.findIndex((n) => n.node.id === id);
    if (index < 0) return undefined;
    const s = loop.nodes[index];
    const d = NODE_STATE_DISPLAY[s.state];
    const isDefault = this.nodeId() === null;
    const pinned = this.pinnedId() === s.node.id;
    return {
      s,
      order: index + 1,
      kicker: isDefault ? 'Where the loop broke' : pinned ? 'Selected loop node' : 'Loop node',
      stateText: s.mismatch ? tw('text-warn') : d.text,
      stateLabel: s.mismatch ? 'Reads closed after the break — sensor mismatch' : stateLabel(s, loop),
      disc: cx(discBase, s.node.topic ? d.marker.measured : d.marker.unmeasured),
      kind: KIND_LABEL[s.node.kind],
      value: formatValue(s.value),
      age: s.ageMs === undefined ? 'never' : formatAge(s.ageMs),
      why: explainNode(s, loop),
      serverNote: serverNote(s, loop),
      notes: nodeNotes(s)
    };
  });
}
