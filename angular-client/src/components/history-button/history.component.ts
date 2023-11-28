import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Run } from 'src/utils/types.utils';
import { Carousel } from '../carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';

@Component({
  selector: 'history',
  templateUrl: './history.component.html'
})
export class History implements OnInit {
  label!: string;
  runs!: Run[];
  runsError?: Error;
  runsIsLoading = true;
  runsIsError = false;

  constructor(
    public dialog: MatDialog,
    private serverService: APIService
  ) {}

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns());
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error: Error) => {
      this.runsIsError = true;
      this.runsError = error;
    });
    runsQueryResponse.data.subscribe((data: Run[]) => {
      this.runs = data;
    });

    this.label = 'Historical';
  }

  openDialog = () => {
    this.dialog.open(Carousel, {
      width: '550px',
      data: { runs: this.runs },
      hasBackdrop: true,
      backdropClass: 'dialog-background'
    });
  };
}
