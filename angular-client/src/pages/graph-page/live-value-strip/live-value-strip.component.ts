import { ChangeDetectionStrategy, Component, Signal, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, startWith, switchMap } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { DataType } from 'src/utils/types.utils';

interface LiveStripItem {
  name: string;
  shortName: string;
  value: string;
  unit: string;
}

@Component({
  selector: 'live-value-strip',
  templateUrl: './live-value-strip.component.html',
  styleUrls: ['./live-value-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class LiveValueStripComponent {
  private storage = inject(Storage);

  dataTypes = input<DataType[]>([]);

  displayItems: Signal<LiveStripItem[]> = toSignal(
    toObservable(this.dataTypes).pipe(
      switchMap((dataTypes) => {
        if (dataTypes.length === 0) return of<LiveStripItem[]>([]);
        return combineLatest(
          dataTypes.map((dt) => {
            const parts = dt.name.split('/');
            const shortName = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
            const placeholder: LiveStripItem = { name: dt.name, shortName, value: '-', unit: dt.unit };
            return this.storage.get(dt.name).pipe(
              map((dv) => {
                const num = dv?.values?.length ? decimalPipe(dv.values[0], 2) : NaN;
                return {
                  name: dt.name,
                  shortName,
                  value: Number.isNaN(num) ? '-' : num.toFixed(2),
                  unit: dv?.unit ?? dt.unit
                };
              }),
              startWith(placeholder)
            );
          })
        );
      })
    ),
    { initialValue: [] }
  );
}
