import { ChangeDetectionStrategy, Component, Signal, computed, inject, input, model } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs';
import { InputNumber } from 'primeng/inputnumber';
import Storage from 'src/services/storage.service';
import { CarCommandRow } from 'src/utils/types.utils';

const PLACEHOLDER = '--';

@Component({
  selector: 'command-row',
  templateUrl: './command-row.component.html',
  styleUrls: ['./command-row.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputNumber]
})
export default class CommandRowComponent {
  private storage = inject(Storage);

  row = input.required<CarCommandRow>();
  value = model<number>(0);

  protected inputId = computed(() => this.row().dataType.name.replaceAll('/', '-') + '-input');

  protected currentValue: Signal<string> = toSignal(
    toObservable(this.row).pipe(
      map((r) => r.dataType.name),
      distinctUntilChanged(),
      switchMap((name) =>
        this.storage.get(name).pipe(
          map((dv) => {
            const v = dv?.values?.[0];
            return v === null || v === undefined ? PLACEHOLDER : String(v);
          }),
          startWith(PLACEHOLDER)
        )
      )
    ),
    { initialValue: PLACEHOLDER }
  );
}
