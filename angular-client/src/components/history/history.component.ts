import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Run } from 'src/utils/types.utils';
import APIService from 'src/services/api.service';
import { CarouselRun } from '../carousel/carousel.component';
// import { getAllRuns } from 'src/api/run.api';

// ok the history component should query all the runs and display
// each run as a card with the required info

@Component({
  selector: 'history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryButton {
  runs: Run[];
  serverService = new APIService();

  constructor(public dialog: MatDialog) {
    // currently using sample run data, actual would use api call something like below
    // this.runs = this.serverService.query<Run[]>(getAllRuns).data.subscribe.arguments;
    this.runs = [
      { id: 1, locationName: 'Boston', driverName: 'Bruh', systemName: 'Yuh', time: 1100 },
      { id: 2, locationName: 'China', driverName: 'Bruh', systemName: 'Yuh', time: 1200 },
      { id: 3, locationName: 'China', driverName: 'Bruh', systemName: 'Yuh', time: 1300 }
    ];
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
