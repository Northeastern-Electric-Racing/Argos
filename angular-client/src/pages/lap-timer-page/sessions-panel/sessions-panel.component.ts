import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from 'src/services/toast.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiButton, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { injectConfirm } from 'src/utils/confirm.utils';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LapTimerService from 'src/services/lap-timer.service';
import { formatMs, LapSession } from 'src/utils/lap-timer.types';

@Component({
  selector: 'sessions-panel',
  templateUrl: './sessions-panel.component.html',
  styleUrl: './sessions-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatIcon,
    TuiTable,
    TuiDataList,
    TuiDropdown,
    TuiButton,
    InfoBackgroundComponent,
    TypographyComponent
  ]
})
export default class SessionsPanelComponent {
  private destroyRef = inject(DestroyRef);
  readonly timer = inject(LapTimerService);
  private confirm = injectConfirm();
  private toasts = inject(ToastService);

  readonly editingSessionId = signal<string | null>(null);
  readonly editingName = signal('');
  /** The session whose actions menu is open */
  readonly menuSessionId = signal<string | null>(null);

  onClearAllSessions = () => {
    const count = this.timer.sessions().length;
    if (count === 0) return;
    this.confirm('Clear All Sessions', {
      content: `Delete all ${count} ${count === 1 ? 'session' : 'sessions'} and their laps? This cannot be undone.`,
      yes: 'Clear All',
      no: 'Cancel'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.timer.clearAllSessions();
        this.toast('positive', 'All sessions cleared', '');
      });
  };

  onNewSession = () => {
    if (!this.timer.activeSession() || this.timer.isIdle()) {
      this.timer.createSession();
      const s = this.timer.activeSession();
      this.toast('positive', 'Session created', s ? `"${s.name}"` : '');
      return;
    }
    this.confirm('New Session', {
      content: 'Pause the current session and start a new one?',
      yes: 'New Session',
      no: 'Cancel'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.timer.createSession();
        const s = this.timer.activeSession();
        this.toast('positive', 'Session created', s ? `"${s.name}"` : '');
      });
  };

  onSelectSession = (id: string) => {
    if (this.timer.activeSession()?.id === id) return;
    this.timer.selectSession(id);
  };

  onDeleteSession = (session: LapSession) => {
    this.menuSessionId.set(null);
    if (session.laps.length === 0) {
      this.timer.deleteSession(session.id);
      this.toast('positive', 'Session deleted', `"${session.name}"`);
      return;
    }
    this.confirm('Delete Session', {
      content: `Delete "${session.name}" and its ${session.laps.length} laps?`,
      yes: 'Delete',
      no: 'Cancel'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.timer.deleteSession(session.id);
        this.toast('positive', 'Session deleted', `"${session.name}"`);
      });
  };

  onDownload = (sessionId: string) => {
    this.menuSessionId.set(null);
    const filename = this.timer.downloadCsv(sessionId);
    if (filename) this.toast('positive', 'Downloaded', filename);
  };

  startEdit(session: LapSession): void {
    this.menuSessionId.set(null);
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

  bestLapMsForSession(sessionId: string): number | null {
    return this.timer.getBestLapMs(sessionId);
  }

  /** Null for historical rows. */
  activeStateIcon(session: LapSession): string | null {
    if (this.timer.activeSession()?.id !== session.id) return null;
    if (session.isRunning) return 'play_arrow';
    if (session.isPaused) return 'pause';
    return null;
  }

  private toast(appearance: 'positive' | 'warning' | 'negative' | 'info', label: string, detail: string): void {
    this.toasts.show(detail, { label, appearance, autoClose: 2000 });
  }
}
