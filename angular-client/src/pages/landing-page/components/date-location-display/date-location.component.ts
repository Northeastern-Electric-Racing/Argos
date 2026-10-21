import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { getLatestRun } from 'src/api/run.api';
import { Run } from 'src/utils/types.utils';
import APIService from 'src/services/api.service';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { DividerComponent } from '../../../../components/divider/divider';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'date-location',
  templateUrl: './date-location.component.html',
  styleUrl: './date-location.component.css',
  imports: [InfoBackgroundComponent, DividerComponent, DatePipe, TypographyComponent, VStackComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class DateLocationComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private notification = inject(NotificationAnnouncerService);
  time = new Date();
  // TODO: create query for most recent run on scylla
  location!: string;
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;

  async ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);

    // query for the most recent run to get the location name
    const runsQueryResponse = this.serverService.query<Run>(() => getLatestRun());
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      // TODO: possible loading spinner... but we already have a no location set message
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) {
        this.notification.create('error', 'Error', error.message);
      }
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const run = data;
      this.location = run?.locationName || 'No Location Set';
    });
  }

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
