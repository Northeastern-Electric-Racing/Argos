import { ChangeDetectionStrategy, Component, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from 'src/services/toast.service';
import { injectConfirm } from 'src/utils/confirm.utils';
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
  private destroyRef = inject(DestroyRef);
  readonly timer = inject(LapTimerService);
  private confirm = injectConfirm();
  private toasts = inject(ToastService);

  readonly currentLapDeltaText = computed(() => formatDeltaMs(this.timer.currentLapDeltaToBestMs()));
  readonly currentLapDeltaClass = computed(() => {
    const d = this.timer.currentLapDeltaToBestMs();
    if (d === null) return 'delta-neutral';
    return d < 0 ? 'delta-negative' : d > 0 ? 'delta-positive' : 'delta-neutral';
  });

  onStart = () => this.timer.start();
  onPause = () => this.timer.pause();
  onResume = () => this.timer.resume();
  onLap = () => this.timer.lap();
  onStop = () => this.timer.stop();

  onReset = () => {
    if (this.timer.laps().length === 0 && this.timer.currentLapTimeMs() === 0) {
      this.timer.reset();
      return;
    }
    this.confirm('Reset Active Session', {
      content: 'Discard all recorded laps in this session?',
      yes: 'Reset',
      no: 'Cancel'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.timer.reset());
  };

  onEndActiveSession = () => {
    this.timer.endActiveSession();
    this.toast('positive', 'Session ended', 'It remains in the history.');
  };

  onDeleteActiveButton = () => {
    const active = this.timer.activeSession();
    if (active) this.timer.deleteSession(active.id);
  };

  onDownloadActiveButton = () => {
    const filename = this.timer.downloadCsv();
    if (filename) this.toast('positive', 'Downloaded', filename);
  };

  private toast(appearance: 'positive' | 'warning' | 'negative' | 'info', label: string, detail: string): void {
    this.toasts.show(detail, { label, appearance, autoClose: 2000 });
  }
}
