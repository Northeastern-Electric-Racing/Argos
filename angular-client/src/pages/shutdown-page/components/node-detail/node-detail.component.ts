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
  nodeNotes
} from '../../shutdown-loop.display';
import { LoopStatus } from '../../shutdown-loop.utils';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

const discBase = tw('grid size-10 shrink-0 place-items-center rounded-full border-3');

/**
 * Details of one node: what it is, its raw reading and age, and why it is in its state in loop terms. Shows the
 * node given (the page's highlighted one), else the break while the loop is open.
 */
@Component({
  selector: 'node-detail',
  templateUrl: './node-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [StatusGlyphComponent, UiIconComponent]
})
export class NodeDetailComponent {
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
