import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent, DialogData } from '../../../../components/carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

@Component({
  selector: 'run-selector',
  templateUrl: './run-selector.component.html',
  styleUrls: ['./run-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiButton]
})
export class RunSelectorComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dialogs = inject(TuiDialogService);
  private serverService = inject(APIService);
  private toasts = inject(ToastService);
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  selectRun = input.required<(run: Run) => void>();

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.toasts.show(error.message, { label: 'Error', appearance: 'negative' });
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) this.runs = data;
    });

    this.label = 'Select Run';
  }

  openDialog = () => {
    this.dialogs
      .open<void>(new PolymorpheusComponent(CarouselComponent), {
        label: 'Select a run to view',
        data: { runs: this.runs, selectRun: this.selectRun() } satisfies DialogData
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  };
}
