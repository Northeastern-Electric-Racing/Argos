import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Run } from 'src/utils/types.utils';
import APIService from 'src/services/api.service';
import { CarouselRun } from '../carousel/carousel.component';
// import { getAllRuns } from 'src/api/run.api';

// ok the history component querys all the runs and displays
// each run as a card with the required info

@Component({
  selector: 'history',
  templateUrl: './history.component.html'
})
export class HistoryButton {
  @Input() serverService!: APIService;
  label: string;
  runs: Run[];
  runsError?: Error;
  runsIsLoading = true;
  runsIsError = false;

  constructor(private dialog: MatDialog) {
    // currently using sample run data, actual would use api call something like below idk
    /*
    const runsQueryResponse = this.serverService.query<Run[]>(getAllRuns);
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error: Error) => {
      this.runsIsError = true;
      this.runsError = error;
    });
    runsQueryResponse.data.subscribe((data: Run[]) => {
      console.log(data);
      this.runs = data;
    });
    */
    this.runs = [
      { id: 1, locationName: 'Boston', driverName: 'Bruh', systemName: 'Yuh', time: 1100 },
      { id: 2, locationName: 'China', driverName: 'Bruh', systemName: 'Yuh', time: 1200 },
      { id: 3, locationName: 'China', driverName: 'Bruh', systemName: 'Yuh', time: 1300 }
    ];
    this.label = 'Historical';
  }

  openDialog(): void {
    this.dialog.open(CarouselRun, {
      width: '550px',
      data: { runs: this.runs },
      hasBackdrop: true,
      backdropClass: 'dialog-background'
    });
  }
}
