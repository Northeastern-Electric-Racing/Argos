import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { tw } from 'src/ui/recipes/tw';
import { ConnectionDotWithMessageComponent } from '../connection-dot-with-message/connection-dot-with-message.component';

/** The value and unit row: the unit beside the value's cap height, or (unitBelow) on its baseline. */
const valueRow = {
  beside: tw('flex flex-nowrap items-baseline gap-0.5 whitespace-nowrap'),
  below: tw('flex flex-nowrap items-end gap-1.5 whitespace-nowrap')
};
const unit = {
  beside: tw('self-start pt-1.5 font-sans text-base leading-none font-bold text-fg-muted'),
  below: tw('self-end pb-0.5 font-sans text-sm leading-none font-bold text-fg-muted')
};

@Component({
  selector: 'stat-display',
  templateUrl: './stat-display.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiIconComponent, ConnectionDotWithMessageComponent],
  host: { class: 'flex min-w-0 flex-1 flex-col items-center justify-end' }
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

  protected valueRowClass = computed(() => (this.unitBelow() ? valueRow.below : valueRow.beside));
  protected unitClass = computed(() => (this.unitBelow() ? unit.below : unit.beside));

  formattedValue = computed(() => {
    const val = this.value();
    if (!Number.isFinite(val)) return '-';
    return val!.toFixed(this.precision()) + (this.unit() === 'C' ? '°' : '');
  });
}
