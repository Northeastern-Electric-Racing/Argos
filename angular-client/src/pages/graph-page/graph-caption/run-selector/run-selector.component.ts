import { Component, Input, OnInit, inject } from '@angular/core';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent } from '../../../../components/carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'run-selector',
  templateUrl: './run-selector.component.html'
})
export class RunSelectorComponent implements OnInit {
  public dialogService = inject(DialogService);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  ref?: DynamicDialogRef;
  @Input() selectRun: (run: Run) => void = () => {};

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.subscribe((data) => {
      if (data) this.runs = data;
    });

    this.label = 'Select Run';
  }

  openDialog = () => {
    this.ref = this.dialogService.open(CarouselComponent, {
      width: '550px',
      data: { runs: this.runs, selectRun: this.selectRun },
      header: 'Select a run to view'
    });
  };
}
