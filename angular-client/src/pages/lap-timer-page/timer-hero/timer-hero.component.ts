import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatDeltaMs } from 'src/utils/lap-timer.types';

@Component({
  selector: 'timer-hero',
  templateUrl: './timer-hero.component.html',
  styleUrl: './timer-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzButtonModule, InfoBackgroundComponent]
})
export default class TimerHeroComponent {
  readonly timer = inject(LapTimerService);
  private modal = inject(NzModalService);
  private notification = inject(NotificationAnnouncerService);

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
    this.modal.confirm({
      nzContent: 'Discard all recorded laps in this session?',
      nzTitle: 'Reset Active Session',
      nzOkText: 'Reset',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => this.timer.reset()
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

  private toast(severity: 'success' | 'warning' | 'error' | 'info', summary: string, detail: string): void {
    this.notification.create(severity, summary, detail, { nzDuration: 2000 });
  }
}
