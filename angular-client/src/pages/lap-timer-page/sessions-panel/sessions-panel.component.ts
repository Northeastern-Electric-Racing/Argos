import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { SessionAction, SessionMenuComponent } from './session-menu/session-menu.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import LapTimerService from 'src/services/lap-timer.service';
import { UiInputDirective } from 'src/ui/field/field.directive';
import { iconClasses } from 'src/ui/recipes/icon';
import { lightHeaderCellClass, rowClass } from 'src/ui/recipes/table';
import { cx, tw } from 'src/ui/recipes/tw';
import { formatMs, LapSession } from 'src/utils/lap-timer.types';
import { injectFocusAfterRender } from '../focus-after-render';
import { lapTimerClasses } from '../lap-timer.classes';

/** Body cells: 6px rows (tighter than the laps table), the state column hugging its icon. */
const cell = tw('border-b border-solid border-border px-3 py-1.5');
const stateCell = tw('border-b border-solid border-border py-1.5 pr-0 pl-2 text-center');
const numeric = tw('text-right tabular-nums');
/** The active session's row is marked by a 3px green edge on its first cell (and a faint tint on the row). */
const activeEdge = tw('border-l-3 border-l-battery-high');

@Component({
  selector: 'sessions-panel',
  templateUrl: './sessions-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full' },
  imports: [
    DatePipe,
    FormsModule,
    MatIcon,
    SessionMenuComponent,
    ButtonComponent,
    InfoBackgroundComponent,
    TypographyComponent,
    UiInputDirective
  ]
})
export default class SessionsPanelComponent {
  readonly timer = inject(LapTimerService);
  private confirmationService = inject(ConfirmService);
  private messageService = inject(ToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private newSession = viewChild.required('newSession', { read: ElementRef });
  private focusAfterRender = injectFocusAfterRender();

  protected readonly cls = lapTimerClasses;
  protected readonly iconSm = iconClasses.sm;
  protected readonly rowClass = cx(rowClass({ hover: true }), tw('data-[active=true]:bg-fg/4'));
  protected readonly headers = {
    state: tw('w-8 border-b border-solid border-border py-2 pr-0 pl-2'),
    name: lightHeaderCellClass(),
    started: cx(lightHeaderCellClass(), tw('w-35 whitespace-nowrap')),
    laps: cx(lightHeaderCellClass({ align: 'right' }), tw('w-15')),
    best: cx(lightHeaderCellClass({ align: 'right' }), tw('w-22.5')),
    run: cx(lightHeaderCellClass({ align: 'right' }), tw('w-15')),
    actions: tw('w-10 border-b border-solid border-border px-3 py-2')
  };
  protected readonly cells = {
    name: cx(cell, tw('min-w-0 text-left')),
    started: cx(cell, tw('whitespace-nowrap tabular-nums')),
    laps: cx(cell, tw('text-right')),
    best: cx(cell, numeric, tw('text-battery-high')),
    run: cx(cell, tw('text-right')),
    actions: cx(cell, tw('text-right'))
  };
  /** The session's name, a real button (the row's click selects it too; 24px tall); the active one is aria-current. */
  protected readonly nameButtonClass = tw(
    'inline-block max-w-full cursor-pointer truncate rounded-xs py-1 text-left align-middle font-sans text-sm font-semibold text-fg focus-visible:focus-ring'
  );

  readonly editingSessionId = signal<string | null>(null);
  readonly editingName = signal('');
  /** Runs the row action picked from the Aria menu. */
  onMenuAction(action: SessionAction, session: LapSession): void {
    if (action === 'rename') this.startEdit(session);
    else if (action === 'download') this.onDownload(session.id);
    else if (action === 'delete') this.onDeleteSession(session);
  }

  onClearAllSessions = () => {
    const count = this.timer.sessions().length;
    if (count === 0) return;
    this.confirmationService.confirm({
      message: `Delete all ${count} ${count === 1 ? 'session' : 'sessions'} and their laps? This cannot be undone.`,
      header: 'Clear All Sessions',
      acceptLabel: 'Clear All',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        this.timer.clearAllSessions();
        this.focusAfterRender(() => this.newSessionButton());
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

  onDeleteSession = (session: LapSession) => {
    if (session.laps.length === 0) {
      this.deleteAndMoveFocus(session);
      return;
    }
    this.confirmationService.confirm({
      message: `Delete "${session.name}" and its ${session.laps.length} laps?`,
      header: 'Delete Session',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => this.deleteAndMoveFocus(session)
    });
  };

  onDownload = (sessionId: string) => {
    const filename = this.timer.downloadCsv(sessionId);
    if (filename) this.toast('success', 'Downloaded', filename);
  };

  /** Opens the name field in place and puts focus in it, with the name selected. */
  startEdit(session: LapSession): void {
    this.editingSessionId.set(session.id);
    this.editingName.set(session.name);
    this.focusAfterRender(() => {
      const input = this.host.nativeElement.querySelector<HTMLInputElement>('input[aria-label="Session name"]');
      input?.select();
      return input;
    });
  }

  /** Saves a changed name. Enter puts focus back on the session's name; focus leaving the field (a click elsewhere) doesn't. */
  commitEdit(session: LapSession, refocus = true): void {
    if (this.editingSessionId() !== session.id) return;
    const next = this.editingName().trim();
    if (next && next !== session.name) {
      this.timer.renameSession(session.id, next);
    }
    this.endEdit(session.id, refocus);
  }

  cancelEdit(session: LapSession): void {
    this.endEdit(session.id, true);
  }

  stateCellClass(session: LapSession): string {
    return cx(stateCell, this.timer.activeSession()?.id === session.id && activeEdge);
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

  private endEdit(id: string, refocus: boolean): void {
    this.editingSessionId.set(null);
    this.editingName.set('');
    if (refocus) this.focusAfterRender(() => this.nameButton(id));
  }

  /** Deletes the session, then focuses the session now in its place (or the one above), else New Session. */
  private deleteAndMoveFocus(session: LapSession): void {
    const index = this.timer.sessions().findIndex((s) => s.id === session.id);
    this.timer.deleteSession(session.id);
    const rest = this.timer.sessions();
    const next = rest[Math.min(index, rest.length - 1)];
    this.focusAfterRender(() => (next ? this.nameButton(next.id) : this.newSessionButton()));
    this.toast('success', 'Session deleted', `"${session.name}"`);
  }

  private nameButton(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`button[data-session="${id}"]`);
  }

  private newSessionButton(): HTMLElement | null {
    return this.newSession().nativeElement.querySelector('button');
  }

  private toast(severity: 'success' | 'warn' | 'error' | 'info', summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 2000 });
  }
}
