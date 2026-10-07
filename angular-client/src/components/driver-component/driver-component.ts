import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getLatestRun } from 'src/api/run.api';
import { topics } from 'src/utils/topic.utils';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { Run } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';
import VStackComponent from '../vstack/vstack.component';

@Component({
  selector: 'driver-component',
  templateUrl: './driver-component.html',
  styleUrls: ['./driver-component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, VStackComponent]
})
export class DriverComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  driver: string = 'No Driver';
  apiService = inject(APIService);

  ngOnInit() {
    this.storage
      .get(topics.driver())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        [this.driver] = value.values || ['No Driver'];
      });
  }

  updateDriverName() {
    const latestRunQuery = this.apiService.query<Run>(() => getLatestRun());
    latestRunQuery.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading: boolean) => {
      if (loading) {
        // TODO
      }
    });
    latestRunQuery.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) {
        // TODO
      }
    });
    latestRunQuery.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const latestRun = data;
      this.driver = latestRun?.driverName === undefined || latestRun?.driverName === '' ? 'No Driver' : latestRun.driverName;
    });
  }
}
