import { Component, HostListener, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { getLatestRun } from 'src/api/run.api';
import { Run } from 'src/utils/types.utils';
import APIService from 'src/services/api.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'date-location',
  templateUrl: './date-location.component.html',
  styleUrl: './date-location.component.css'
})
export class DateLocationComponent implements OnInit {
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
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
    runsQueryResponse.isLoading.subscribe(() => {
      // TODO: possible loading spinner... but we already have a no location set message
    });
    runsQueryResponse.error.subscribe((error) => {
      if (error) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      }
    });
    runsQueryResponse.data.subscribe((data) => {
      const run = data;
      this.location = run?.locationName || 'No Location Set';
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
