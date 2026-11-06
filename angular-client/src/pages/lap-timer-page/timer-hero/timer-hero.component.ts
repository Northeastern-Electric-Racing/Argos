import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import LapTimerService from 'src/services/lap-timer.service';
import { cx, tw } from 'src/ui/recipes/tw';
import { formatDeltaMs } from 'src/utils/lap-timer.types';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import { lapTimerClasses } from '../lap-timer.classes';

const deltaBase = tw('text-right font-sans text-base font-semibold tabular-nums');
/** Slower than the best lap: red text; faster: green; no best yet or level: muted. */
const deltaTones = {
  positive: tw('text-accent-fg'),
  negative: tw('text-battery-high'),
  neutral: tw('text-fg-muted')
} as const;

@Component({
  selector: 'timer-hero',
  templateUrl: './timer-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full' },
  imports: [ButtonComponent, InfoBackgroundComponent]
})
export default class TimerHeroComponent {
  readonly timer = inject(LapTimerService);
  private confirmationService = inject(ConfirmService);
  private messageService = inject(ToastService);
  private actions = viewChild.required<ElementRef<HTMLElement>>('actions');
  private focusAfterRender = injectFocusAfterRender();

  protected readonly cls = lapTimerClasses;
  protected readonly dividerClass = cx(lapTimerClasses.divider, tw('my-1 w-3/5'));
  readonly currentLapDeltaText = computed(() => formatDeltaMs(this.timer.currentLapDeltaToBestMs()));
  readonly currentLapDeltaClass = computed(() => {
    const d = this.timer.currentLapDeltaToBestMs();
    const tone = d === null || d === 0 ? 'neutral' : d < 0 ? 'negative' : 'positive';
    return cx(deltaBase, deltaTones[tone]);
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

  /**
   * Runs a state change, then focuses the first action button once the new set has rendered. After a mouse
   * click (here or on the Reset confirm's button) the moved focus shows no ring, as the click itself would not.
   */
  private changeState(change: () => void): void {
    change();
    this.focusAfterRender(() => this.actions().nativeElement.querySelector('button'));
  }

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
