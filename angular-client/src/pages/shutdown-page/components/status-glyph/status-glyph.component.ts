import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconSize } from 'src/ui/recipes/icon';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { NODE_STATE_DISPLAY } from '../../shutdown-loop.display';
import { NodeState } from '../../shutdown-loop.utils';

/** The decorative icon for a node state (check, cross, dash, question mark); its label says the state in words. */
@Component({
  selector: 'status-glyph',
  templateUrl: './status-glyph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  imports: [UiIconComponent]
})
export class StatusGlyphComponent {
  state = input.required<NodeState>();
  size = input<IconSize>('sm');

  protected readonly icon = computed(() => NODE_STATE_DISPLAY[this.state()].icon);
}
