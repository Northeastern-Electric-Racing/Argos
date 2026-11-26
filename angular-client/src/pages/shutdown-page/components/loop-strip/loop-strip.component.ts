import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NODE_STATE_DISPLAY, PLACEHOLDER_TAG } from '../../shutdown-loop.display';
import { NodeStatus } from '../../shutdown-loop.utils';
import { StatusGlyphComponent } from '../status-glyph/status-glyph.component';

/** The shutdown loop laid out in series order, one item per node. */
@Component({
  selector: 'loop-strip',
  templateUrl: './loop-strip.component.html',
  styleUrls: ['../../shutdown-states.css', './loop-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusGlyphComponent]
})
export class LoopStripComponent {
  nodes = input.required<NodeStatus[]>();

  readonly display = NODE_STATE_DISPLAY;
  readonly placeholderTag = PLACEHOLDER_TAG;
}
