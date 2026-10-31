import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector } from '@angular/core';
import { ConfirmService } from 'src/services/confirm.service';
import { showToast } from 'src/utils/toast.utils';
import { HlmButton } from '@spartan-ng/helm/button';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatDeltaMs } from 'src/utils/lap-timer.types';
import { focusIfLost } from 'src/utils/focus.utils';

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
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  readonly currentLapDeltaText = computed(() => formatDeltaMs(this.timer.currentLapDeltaToBestMs()));
  readonly currentLapDeltaClass = computed(() => {
    const d = this.timer.currentLapDeltaToBestMs();
    if (d === null) return 'delta-neutral';
    return d < 0 ? 'delta-negative' : d > 0 ? 'delta-positive' : 'delta-neutral';
  });

  /** Each timer state shows its own buttons, so the one just pressed is often gone. */
  private firstAction = () => this.host.nativeElement.querySelector<HTMLElement>('.hero-actions button');
  private keepFocus = () => focusIfLost(this.firstAction, this.injector);

  onStart = () => {
    this.timer.start();
    this.keepFocus();
  };
  onPause = () => {
    this.timer.pause();
    this.keepFocus();
  };
  onResume = () => {
    this.timer.resume();
    this.keepFocus();
  };
  onLap = () => this.timer.lap();
  onStop = () => {
    this.timer.stop();
    this.keepFocus();
  };

  onReset = () => {
    if (this.timer.laps().length === 0 && this.timer.currentLapTimeMs() === 0) {
      this.timer.reset();
      this.keepFocus();
      return;
    }
    this.confirmService.confirm({
      message: 'Discard all recorded laps in this session?',
      header: 'Reset Active Session',
      acceptLabel: 'Reset',
      destructive: true,
      rejectLabel: 'Cancel',
      accept: () => this.timer.reset(),
      focusFallback: this.firstAction
    });
  };

  onEndActiveSession = () => {
    this.timer.endActiveSession();
    this.keepFocus();
    this.toast('success', 'Session ended', 'It remains in the history.');
  };

  onDeleteActiveButton = () => {
    const active = this.timer.activeSession();
    if (active) this.timer.deleteSession(active.id);
    this.keepFocus();
  };

  onDownloadActiveButton = () => {
    const filename = this.timer.downloadCsv();
    if (filename) this.toast('success', 'Downloaded', filename);
  };

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    showToast(severity, summary, detail, 2000);
  }
}
