import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { DataType } from 'src/utils/types.utils';
import TypographyComponent from 'src/components/typography/typography.component';

interface MqttValueEntry {
  name: string;
  displayName: string;
  value: string;
  unit: string;
}

@Component({
  selector: 'mqtt-mobile-view',
  templateUrl: './mqtt-mobile-view.component.html',
  styleUrls: ['./mqtt-mobile-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent]
})
export default class MqttMobileViewComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private serverService = inject(APIService);

  private subscriptions: Subscription[] = [];

  searchQuery = signal('');
  mqttEntries = signal<MqttValueEntry[]>([]);
  isLoading = signal(true);

  filteredEntries = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const entries = this.mqttEntries();
    if (!query) {
      return entries;
    }
    return entries.filter(
      (entry) => entry.name.toLowerCase().includes(query) || entry.displayName.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.queryDataTypes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  private queryDataTypes(): void {
    const dataTypesQuery = this.serverService.query<DataType[]>(getAllDatatypes);

    this.subscriptions.push(
      dataTypesQuery.isLoading.subscribe((loading: boolean) => {
        this.isLoading.set(loading);
      })
    );

    this.subscriptions.push(
      dataTypesQuery.data.subscribe((dataTypes) => {
        if (dataTypes) {
          this.setupLiveValues(dataTypes);
        }
      })
    );
  }

  private setupLiveValues(dataTypes: DataType[]): void {
    const entries: MqttValueEntry[] = dataTypes.map((dt) => ({
      name: dt.name,
      displayName: this.formatTopicName(dt.name),
      value: '--',
      unit: dt.unit
    }));

    this.mqttEntries.set(entries);

    dataTypes.forEach((dt) => {
      this.subscriptions.push(
        this.storage.get(dt.name).subscribe((dataValue) => {
          this.mqttEntries.update((current) =>
            current.map((entry) => {
              if (entry.name === dt.name) {
                const numericValue = decimalPipe(dataValue.values[0], 3).toFixed(3);
                return { ...entry, value: numericValue, unit: dataValue.unit };
              }
              return entry;
            })
          );
        })
      );
    });
  }

  private formatTopicName(name: string): string {
    const parts = name.split('/');
    if (parts.length <= 1) {
      return name;
    }
    return parts.join(' / ');
  }
}
