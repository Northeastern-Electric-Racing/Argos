import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  viewChild
} from '@angular/core';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatDeltaMs } from 'src/utils/lap-timer.types';

@Component({
  selector: 'timer-hero',
  templateUrl: './timer-hero.component.html',
  styleUrl: './timer-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, InfoBackgroundComponent]
})
export default class TimerHeroComponent {
  readonly timer = inject(LapTimerService);
  private confirmationService = inject(ConfirmService);
  private messageService = inject(ToastService);
  private injector = inject(Injector);
  private actions = viewChild.required<ElementRef<HTMLElement>>('actions');

  readonly currentLapDeltaText = computed(() => formatDeltaMs(this.timer.currentLapDeltaToBestMs()));
  readonly currentLapDeltaClass = computed(() => {
    const d = this.timer.currentLapDeltaToBestMs();
    if (d === null) return 'delta-neutral';
    return d < 0 ? 'delta-negative' : d > 0 ? 'delta-positive' : 'delta-neutral';
  });

  // Start, Pause, Resume, Stop, Reset, End Session and Delete swap the action buttons, removing the
  // one that was pressed; focus then moves to the first action of the new state, not to <body>.
  onStart = () => this.changeState(() => this.timer.start());
  onPause = () => this.changeState(() => this.timer.pause());
  onResume = () => this.changeState(() => this.timer.resume());
  onLap = () => this.timer.lap();
  onStop = () => this.changeState(() => this.timer.stop());

  onReset = () => {
    if (this.timer.laps().length === 0 && this.timer.currentLapTimeMs() === 0) {
      this.changeState(() => this.timer.reset());
      return;
    }
    this.confirmationService.confirm({
      message: 'Discard all recorded laps in this session?',
      header: 'Reset Active Session',
      acceptLabel: 'Reset',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => this.changeState(() => this.timer.reset())
    });
  };

  onEndActiveSession = () => {
    this.changeState(() => this.timer.endActiveSession());
    this.toast('success', 'Session ended', 'It remains in the history.');
  };

  onDeleteActiveButton = () => {
    const active = this.timer.activeSession();
    if (active) this.changeState(() => this.timer.deleteSession(active.id));
  };

  onDownloadActiveButton = () => {
    const filename = this.timer.downloadCsv();
    if (filename) this.toast('success', 'Downloaded', filename);
  };

  /** Runs a state change, then focuses the first action button once the new set has rendered. */
  private changeState(change: () => void): void {
    change();
    afterNextRender(() => this.actions().nativeElement.querySelector('button')?.focus(), { injector: this.injector });
  }

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
