import { Component, HostListener } from '@angular/core';
import { MessageService } from 'primeng/api';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';


@Component({
  selector: 'landing-page-date-location',
  templateUrl: './landing-page-date-location.component.html',
  styleUrl: './landing-page-date-location.component.css'
})
export class LandingPageDateLocation {
  time = new Date();
  location: string = 'Boston, MA';
  newRunIsLoading = false;
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor(
    private storage: Storage,
    private serverService: APIService,
    private messageService: MessageService
  ) {}

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

    this.storage.get(IdentifierDataType.LOCATION).subscribe((value) => {
      [this.location] = value.values || ['No Location Set'];
    });
  }

  onStartNewRun!: () => void;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}