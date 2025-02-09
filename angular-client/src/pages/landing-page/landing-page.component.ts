import { Component, HostListener, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';

/**
 * Container for the landing page, obtains data from the storage service.
 */
@Component({
  selector: 'landing-page',
  styleUrls: ['./landing-page.component.css'],
  templateUrl: './landing-page.component.html'
})
export default class LandingPageComponent implements OnInit {
  private storage = inject(Storage);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.onStartNewRun = () => {
      const runsQueryResponse = this.serverService.query(() => startNewRun());
      runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.newRunIsLoading = isLoading;
      });
      runsQueryResponse.error.subscribe((error: Error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      });
    };

    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }

  onStartNewRun!: () => void;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
