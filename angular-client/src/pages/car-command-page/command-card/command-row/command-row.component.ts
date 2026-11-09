import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  model,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import Storage from 'src/services/storage.service';
import { CarCommandRow } from 'src/utils/types.utils';
import { UiInputDirective } from 'src/ui/field/field.directive';
import { numberInputClass } from 'src/ui/recipes/number-input';

@Component({
  selector: 'command-row',
  templateUrl: './command-row.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiInputDirective]
})
export default class CommandRowComponent implements OnInit {
  private storage = inject(Storage);
  private destroyRef = inject(DestroyRef);

  row = input.required<CarCommandRow>();
  value = model<number>(0);
  /** Fills its grid cell, with tabular figures. */
  protected readonly numberInput = numberInputClass('fill');
  protected readonly min = -1_000_000;
  protected readonly max = 1_000_000;

  protected inputId = computed(() => this.row().dataType.name.replaceAll('/', '-') + '-input');
  protected currentValue = signal<string | undefined>(undefined);

  ngOnInit() {
    this.storage
      .get(this.row().dataType.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dv) => this.currentValue.set(dv?.values?.[0]));
  }

  /**
   * Keeps the value within ±1,000,000 (#541), in the field too, as develop's p-inputnumber did; native min/max
   * only mark the field invalid. An empty field (null) passes through.
   */
  protected onValueChange(typed: number | null, field: HTMLInputElement) {
    const value = typed === null ? typed : Math.min(this.max, Math.max(this.min, typed));
    if (value !== typed) field.value = String(value);
    this.value.set(value as number);
  }
}
