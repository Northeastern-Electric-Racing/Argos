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
import { InputNumber } from 'primeng/inputnumber';
import Storage from 'src/services/storage.service';
import { CarCommandRow } from 'src/utils/types.utils';

@Component({
  selector: 'command-row',
  templateUrl: './command-row.component.html',
  styleUrls: ['./command-row.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputNumber]
})
export default class CommandRowComponent implements OnInit {
  private storage = inject(Storage);
  private destroyRef = inject(DestroyRef);

  row = input.required<CarCommandRow>();
  value = model<number>(0);

  protected inputId = computed(() => this.row().dataType.name.replaceAll('/', '-') + '-input');
  protected currentValue = signal<string | undefined>(undefined);

  ngOnInit() {
    this.storage
      .get(this.row().dataType.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dv) => this.currentValue.set(dv?.values?.[0]));
  }
}
