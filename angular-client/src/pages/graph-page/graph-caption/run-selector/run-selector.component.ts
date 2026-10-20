import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent } from '../../../../components/carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { toast } from '@spartan-ng/brain/sonner';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';

@Component({
  selector: 'run-selector',
  templateUrl: './run-selector.component.html',
  styleUrls: ['./run-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent]
})
export class RunSelectorComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  public dialogService = inject(HlmDialogService);
  private serverService = inject(APIService);
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  ref?: BrnDialogRef;
  selectRun = input.required<(run: Run) => void>();

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) toast.error('Error', { description: error.message });
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) this.runs = data;
    });

    this.label = 'Select Run';
  }

  openDialog = () => {
    this.ref = this.dialogService.open(CarouselComponent, {
      contentClass: 'sm:max-w-[550px]',
      context: { runs: this.runs, selectRun: this.selectRun() }
    });
  };
}
