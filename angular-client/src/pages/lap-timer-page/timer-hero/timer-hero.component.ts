import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmService } from 'src/services/confirm.service';
import { showToast } from 'src/utils/toast.utils';
import { HlmButton } from '@spartan-ng/helm/button';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatDeltaMs } from 'src/utils/lap-timer.types';

@Component({
  selector: 'timer-hero',
  templateUrl: './timer-hero.component.html',
  styleUrl: './timer-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, InfoBackgroundComponent]
})
export default class TimerHeroComponent {
  readonly timer = inject(LapTimerService);
  private confirmService = inject(ConfirmService);

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
    this.confirmService.confirm({
      message: 'Discard all recorded laps in this session?',
      header: 'Reset Active Session',
      acceptLabel: 'Reset',
      destructive: true,
      rejectLabel: 'Cancel',
      accept: () => this.timer.reset()
    });
  };

  onEndActiveSession = () => {
    this.timer.endActiveSession();
    this.toast('success', 'Session ended', 'It remains in the history.');
  };

  onDeleteActiveButton = () => {
    const active = this.timer.activeSession();
    if (active) this.timer.deleteSession(active.id);
  };

  onDownloadActiveButton = () => {
    const filename = this.timer.downloadCsv();
    if (filename) this.toast('success', 'Downloaded', filename);
  };

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    showToast(severity, summary, detail, 2000);
  }
}
