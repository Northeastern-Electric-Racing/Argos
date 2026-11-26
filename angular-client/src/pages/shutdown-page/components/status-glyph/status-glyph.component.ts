import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NodeState } from '../../shutdown-loop.utils';

/** Small decorative icon per node state (check, cross, down-arrow, question mark). */
@Component({
  selector: 'status-glyph',
  templateUrl: './status-glyph.component.html',
  styleUrls: ['./status-glyph.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusGlyphComponent {
  state = input.required<NodeState>();
}
