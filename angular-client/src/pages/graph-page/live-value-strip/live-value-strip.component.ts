import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { DataType } from 'src/utils/types.utils';

@Component({
  selector: 'live-value-strip',
  templateUrl: './live-value-strip.component.html',
  styleUrls: ['./live-value-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class LiveValueStripComponent implements OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  dataTypes = input<DataType[]>([]);

  private liveValues = signal<Map<string, { value: string; unit: string }>>(new Map());

  displayItems = computed(() => {
    const map = this.liveValues();
    return this.dataTypes().map((dt) => {
      const parts = dt.name.split('/');
      const shortName = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
      const entry = map.get(dt.name);
      return {
        name: dt.name,
        shortName,
        value: entry?.value ?? '-',
        unit: entry?.unit ?? dt.unit
      };
    });
  });

  constructor() {
    effect(() => {
      const dataTypes = this.dataTypes();
      this.teardownSubscriptions();

      for (const dt of dataTypes) {
        this.subscriptions.push(
          this.storage.get(dt.name).subscribe((dv) => {
            const formatted = decimalPipe(dv.values[0], 2).toFixed(2);
            this.liveValues.update((prev) => {
              const existing = prev.get(dt.name);
              if (existing?.value === formatted && existing?.unit === dv.unit) return prev;
              const next = new Map(prev);
              next.set(dt.name, { value: formatted, unit: dv.unit });
              return next;
            });
          })
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.teardownSubscriptions();
  }

  private teardownSubscriptions(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
  }
}
