import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
  stateLabel
} from '../../shutdown-loop.display';
import { LoopStatus } from '../../shutdown-loop.utils';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

const discBase = tw('grid size-10 shrink-0 place-items-center rounded-full border-3');

/**
 * Details of one loop node: what it is, its raw reading and age, and why it is in its state in loop terms. Shows
 * the loop node given (the page's active one, ShutdownSelectionStore.activeId), else the break while the loop is
 * open. The page's only detail panel: no view of the loop shows one of its own.
 */
@Component({
  selector: 'loop-node-detail',
  templateUrl: './loop-node-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [StatusGlyphComponent, UiIconComponent]
})
export class LoopNodeDetailComponent {
  status = input.required<LoopStatus>();
  nodeId = input<string | null>(null);

  protected readonly detail = computed(() => {
    const loop = this.status();
    const id = this.nodeId() ?? breakNode(loop)?.id;
    const index = loop.nodes.findIndex((n) => n.node.id === id);
    if (index < 0) return undefined;
    const s = loop.nodes[index];
    const d = NODE_STATE_DISPLAY[s.state];
    return {
      s,
      order: index + 1,
      d,
      stateLabel: stateLabel(s, loop),
      disc: cx(discBase, s.node.topic ? d.marker.measured : d.marker.unmeasured),
      kind: KIND_LABEL[s.node.kind],
      value: formatValue(s.value),
      age: s.ageMs === undefined ? 'never' : formatAge(s.ageMs),
      why: explainNode(s, loop),
      notes: nodeNotes(s),
      isDefault: this.nodeId() === null
    };
  });
}
