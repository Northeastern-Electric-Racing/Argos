import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Popover } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
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
    TableModule,
    Popover,
    ButtonComponent,
    InfoBackgroundComponent,
    TypographyComponent
  ]
})
export default class SessionsPanelComponent {
  readonly timer = inject(LapTimerService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  readonly editingSessionId = signal<string | null>(null);
  readonly editingName = signal('');

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

  onDownload = (sessionId: string, popover?: Popover) => {
    popover?.hide();
    const filename = this.timer.downloadCsv(sessionId);
    if (filename) this.toast('success', 'Downloaded', filename);
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

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
