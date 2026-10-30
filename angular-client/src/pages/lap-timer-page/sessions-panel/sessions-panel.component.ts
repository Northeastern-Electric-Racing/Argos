import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
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
    Menu,
    InputText,
    Button,
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

  // One popup menu serves every row; its items are rebuilt for the row that opened it
  private readonly sessionMenu = viewChild.required<Menu>('sessionMenu');
  readonly sessionMenuItems = signal<MenuItem[]>([]);

  // The rename field appears after the menu closes, so it takes focus itself (autofocus only works on page load)
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  constructor() {
    effect(() => {
      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  openSessionMenu(event: Event, session: LapSession): void {
    this.sessionMenuItems.set([
      { label: 'Rename', icon: 'pi pi-pencil', command: () => this.startEdit(session) },
      { label: 'Download CSV', icon: 'pi pi-download', command: () => this.onDownload(session.id) },
      { separator: true },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'menu-item-danger',
        command: () => this.onDeleteSession(session)
      }
    ]);
    this.sessionMenu().toggle(event);
  }

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

  // The actions menu button lets its click reach the document, so an open menu elsewhere closes; skip row selection for it
  onRowClick = (event: MouseEvent, id: string) => {
    if ((event.target as HTMLElement).closest('.col-actions')) return;
    this.onSelectSession(id);
  };

  onSelectSession = (id: string) => {
    if (this.timer.activeSession()?.id === id) return;
    this.timer.selectSession(id);
  };

  onDeleteSession = (session: LapSession) => {
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

  onDownload = (sessionId: string) => {
    const filename = this.timer.downloadCsv(sessionId);
    if (filename) this.toast('success', 'Downloaded', filename);
  };

  startEdit(session: LapSession): void {
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
