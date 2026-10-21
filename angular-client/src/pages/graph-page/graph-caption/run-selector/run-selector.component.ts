import { Component, OnInit, inject, input, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Run } from 'src/utils/types.utils';
import { CarouselComponent } from '../../../../components/carousel/carousel.component';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
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
  private modal = inject(NzModalService);
  private serverService = inject(APIService);
  private notification = inject(NotificationAnnouncerService);
  label!: string;
  runs!: Run[];
  runsIsLoading = true;
  ref?: NzModalRef<CarouselComponent>;
  selectRun = input.required<(run: Run) => void>();

  ngOnInit() {
    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.notification.create('error', 'Error', error.message);
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) this.runs = data;
    });

    this.label = 'Select Run';
  }

  openDialog = () => {
    this.ref = this.modal.create({
      nzContent: CarouselComponent,
      nzWidth: 550,
      nzData: { runs: this.runs, selectRun: this.selectRun() },
      nzTitle: 'Select a run to view',
      nzFooter: null,
      nzMaskClosable: true // auto-close on outside click
    });
  };
}
