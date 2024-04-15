import { Component, Input, OnInit } from '@angular/core';
import { Run } from 'src/utils/types.utils';
import { Carousel } from '../carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'run-selector',
  templateUrl: './run-selector.component.html'
})
export class RunSelector implements OnInit {
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  ref?: DynamicDialogRef;
  @Input() selectRun: (run: Run) => void = () => {};

  constructor(
    public dialogService: DialogService,
    private serverService: APIService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns());
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error: Error) => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.subscribe((data: Run[]) => {
      this.runs = data;
    });

    this.label = 'Select a run';
  }

  openDialog = () => {
    this.ref = this.dialogService.open(Carousel, {
      width: '550px',
      data: { runs: this.runs, selectRun: this.selectRun },
      header: 'Select a run to view'
    });
  };
}
