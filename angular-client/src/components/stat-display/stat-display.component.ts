import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ConnectionDotWithMessageComponent } from '../connection-dot-with-message/connection-dot-with-message.component';

@Component({
  selector: 'stat-display',
  templateUrl: './stat-display.component.html',
  styleUrl: './stat-display.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, ConnectionDotWithMessageComponent],
  host: {
    '[class.unit-below-mode]': 'unitBelow()'
  }
})
export class StatDisplayComponent {
  value = input<number>();
  unit = input<string>('');
  subtitle = input<string>('');
  precision = input<number>(1);
  headerLabel = input<string>('');
  headerIcon = input<string>('');
  unitBelow = input<boolean>(false);
  connectionDotStatusColor = input<() => string>();

  formattedValue = computed(() => {
    const val = this.value();
    if (!Number.isFinite(val)) return '-';
    return val!.toFixed(this.precision()) + (this.unit() === 'C' ? '°' : '');
  });
}
