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

  protected inputId = computed(() => this.row().dataType.name.replaceAll('/', '-') + '-input');
  protected currentValue = signal<string | undefined>(undefined);

  ngOnInit() {
    this.storage
      .get(this.row().dataType.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dv) => this.currentValue.set(dv?.values?.[0]));
  }
}
