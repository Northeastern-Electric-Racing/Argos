import { Component, OnInit, inject, input, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent } from '../../../../components/carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';

@Component({
  selector: 'run-selector',
  templateUrl: './run-selector.component.html',
  styleUrls: ['./run-selector.component.css'],
  standalone: true,
  imports: [ButtonComponent]
})
export class RunSelectorComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  public dialogService = inject(DialogService);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  ref?: DynamicDialogRef;
  selectRun = input.required<(run: Run) => void>();

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) this.runs = data;
    });

    this.label = 'Select Run';
  }

  openDialog = () => {
    this.ref = this.dialogService.open(CarouselComponent, {
      width: '550px',
      data: { runs: this.runs, selectRun: this.selectRun() },
      header: 'Select a run to view',
      modal: true, // makes the dialog modal
      dismissableMask: true, // enables auto-close on outside click
      closable: true,
      closeAriaLabel: 'Close'
    });
  };
}
