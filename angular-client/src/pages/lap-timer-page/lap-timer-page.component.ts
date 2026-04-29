import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  Signal
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { MatIcon } from '@angular/material/icon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { Popover } from 'primeng/popover';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import HalfGaugeComponent from 'src/components/half-gauge/half-gauge.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LapTimerService from 'src/services/lap-timer.service';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { formatDeltaMs, formatMs, Lap, LapSession } from 'src/utils/lap-timer.types';

@Component({
  selector: 'lap-timer-page',
  templateUrl: './lap-timer-page.component.html',
  styleUrl: './lap-timer-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  imports: [
    MatGridList,
    MatGridTile,
    MatIcon,
    DatePipe,
    DecimalPipe,
    FormsModule,
    TableModule,
    ConfirmDialog,
    Toast,
    Popover,
    ButtonComponent,
    HalfGaugeComponent,
    InfoBackgroundComponent,
    TypographyComponent
  ]
})
export default class LapTimerPageComponent implements OnInit, OnDestroy {
  readonly timer = inject(LapTimerService);
  private storage = inject(Storage);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  readonly liveSpeed = signal(0);
  readonly liveMotorTemp = signal(0);
  readonly liveSoc = signal(0);

  readonly editingSessionId = signal<string | null>(null);
  readonly editingName = signal('');

  readonly speedGaugeColor = signal('#1ae824');

  readonly lapsNewestFirst: Signal<Lap[]> = computed(() => this.timer.laps().slice().reverse());

  readonly socColor = computed(() => {
    const soc = this.liveSoc();
    if (soc >= 60) return 'var(--color-battery-high)';
    if (soc >= 30) return 'var(--color-battery-med)';
    return 'var(--color-battery-low)';
  });

  readonly motorTempColor = computed(() => {
    const t = this.liveMotorTemp();
    if (t < 60) return 'var(--color-text-primary)';
    if (t < 80) return 'var(--color-battery-med)';
    return 'var(--color-battery-low)';
  });

  readonly currentLapDeltaText = computed(() => formatDeltaMs(this.timer.currentLapDeltaToBestMs()));
  readonly currentLapDeltaClass = computed(() => {
    const d = this.timer.currentLapDeltaToBestMs();
    if (d === null) return 'delta-neutral';
    return d < 0 ? 'delta-negative' : d > 0 ? 'delta-positive' : 'delta-neutral';
  });

  private subs: Subscription[] = [];

  ngOnInit(): void {
    const styles = getComputedStyle(document.documentElement);
    const high = styles.getPropertyValue('--color-battery-high').trim();
    if (high) this.speedGaugeColor.set(high);

    this.subs.push(
      this.storage.get(topics.speed()).subscribe((v) => this.liveSpeed.set(parseFloat(v.values[0]) || 0)),
      this.storage.get(topics.motorTemp()).subscribe((v) => this.liveMotorTemp.set(parseFloat(v.values[0]) || 0)),
      this.storage.get(topics.stateOfCharge()).subscribe((v) => this.liveSoc.set(parseFloat(v.values[0]) || 0))
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

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
    this.confirmationService.confirm({
      message: 'Discard all recorded laps in this session?',
      header: 'Reset Active Session',
      acceptLabel: 'Reset',
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
    if (active) this.onDeleteSession(active);
  };

  onDownloadActiveButton = () => this.onDownload();

  onClearAllSessions = () => {
    const count = this.timer.sessions().length;
    if (count === 0) return;
    this.confirmationService.confirm({
      message: `Delete all ${count} ${count === 1 ? 'session' : 'sessions'} and their laps? This cannot be undone.`,
      header: 'Clear All Sessions',
      acceptLabel: 'Clear All',
      rejectLabel: 'Cancel',
      accept: () => {
        this.timer.clearAllSessions();
        this.toast('success', 'All sessions cleared', '');
      }
    });
  };

  onNewSession = () => {
    if (!this.timer.activeSession() || this.timer.isIdle()) {
      this.timer.createSession();
      const s = this.timer.activeSession();
      this.toast('success', 'Session created', s ? `"${s.name}"` : '');
      return;
    }
    this.confirmationService.confirm({
      message: 'Pause the current session and start a new one?',
      header: 'New Session',
      acceptLabel: 'New Session',
      rejectLabel: 'Cancel',
      accept: () => {
        this.timer.createSession();
        const s = this.timer.activeSession();
        this.toast('success', 'Session created', s ? `"${s.name}"` : '');
      }
    });
  };

  onSelectSession = (id: string) => {
    if (this.timer.activeSession()?.id === id) return;
    this.timer.selectSession(id);
  };

  onDeleteSession = (session: LapSession, popover?: Popover) => {
    popover?.hide();
    if (session.laps.length === 0) {
      this.timer.deleteSession(session.id);
      this.toast('success', 'Session deleted', `"${session.name}"`);
      return;
    }
    this.confirmationService.confirm({
      message: `Delete "${session.name}" and its ${session.laps.length} laps?`,
      header: 'Delete Session',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.timer.deleteSession(session.id);
        this.toast('success', 'Session deleted', `"${session.name}"`);
      }
    });
  };

  onDownload = (sessionId?: string, popover?: Popover) => {
    popover?.hide();
    const filename = this.timer.downloadCsv(sessionId);
    if (filename) this.toast('success', 'Downloaded', filename);
    else this.toast('warn', 'Nothing to download', 'No active session.');
  };

  startEdit(session: LapSession, popover?: Popover): void {
    popover?.hide();
    this.editingSessionId.set(session.id);
    this.editingName.set(session.name);
  }

  commitEdit(session: LapSession): void {
    if (this.editingSessionId() !== session.id) return;
    const next = this.editingName().trim();
    if (next && next !== session.name) {
      this.timer.renameSession(session.id, next);
    }
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingSessionId.set(null);
    this.editingName.set('');
  }

  formatLapMs(ms: number): string {
    return formatMs(ms);
  }

  formatLapDelta(lap: Lap): string {
    return formatDeltaMs(this.timer.deltaFromBest(lap.durationMs));
  }

  isBestLap(lap: Lap): boolean {
    return this.timer.bestLap()?.number === lap.number;
  }

  isWorstLap(lap: Lap): boolean {
    if (this.timer.laps().length < 3) return false;
    return this.timer.worstLap()?.number === lap.number;
  }

  /** Null for historical rows. */
  activeStateIcon(session: LapSession): string | null {
    if (this.timer.activeSession()?.id !== session.id) return null;
    if (session.isRunning) return 'play_arrow';
    if (session.isPaused) return 'pause';
    return null;
  }

  bestLapMsForSession(sessionId: string): number | null {
    return this.timer.getBestLapMs(sessionId);
  }

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
