import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import LapTimerService from 'src/services/lap-timer.service';
import SessionsPanelComponent from './sessions-panel.component';

describe('SessionsPanelComponent', () => {
  let fixture: ComponentFixture<SessionsPanelComponent>;
  let component: SessionsPanelComponent;
  let timer: LapTimerService;

  const menuItem = (label: string): MenuItem => {
    const item = component.sessionMenuItems().find((i) => i.label === label);
    expect(item).toBeDefined();
    return item!;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SessionsPanelComponent],
      providers: [ConfirmationService, MessageService]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionsPanelComponent);
    component = fixture.componentInstance;
    timer = TestBed.inject(LapTimerService);
    timer.createSession('Practice');
    fixture.detectChanges();
  });

  it('opens one actions menu with the row session actions', () => {
    const [session] = timer.sessions();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Session actions"]');
    expect(trigger).toBeTruthy();

    component.openSessionMenu(new MouseEvent('click'), session);

    const labels = component.sessionMenuItems().map((i) => i.label);
    expect(labels).toEqual(['Rename', 'Download CSV', undefined, 'Delete']);
  });

  it('Rename starts editing that session in a focused field', async () => {
    const [session] = timer.sessions();
    component.openSessionMenu(new MouseEvent('click'), session);

    menuItem('Rename').command!({});

    expect(component.editingSessionId()).toBe(session.id);
    expect(component.editingName()).toBe('Practice');

    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Session name"]');
    expect(document.activeElement).toBe(input);
  });

  it('Delete removes a session that has no laps', () => {
    const [session] = timer.sessions();
    component.openSessionMenu(new MouseEvent('click'), session);

    menuItem('Delete').command!({});

    expect(timer.sessions().find((s) => s.id === session.id)).toBeUndefined();
  });
  it('Enter on a row actions button opens the menu without switching to that session', () => {
    timer.createSession('Qualifying');
    fixture.detectChanges();
    const active = timer.activeSession()!.id;
    const other = timer.sessions().find((x) => x.id !== active)!;
    const rows = [...fixture.nativeElement.querySelectorAll('tr.session-row')] as HTMLElement[];
    const otherRow = rows.find((r) => r.textContent!.includes(other.name))!;
    const actions: HTMLButtonElement = otherRow.querySelector('button[aria-label="Session actions"]')!;

    actions.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    expect(timer.activeSession()!.id).toBe(active);
  });

  it('Enter on a row itself switches to that session', () => {
    timer.createSession('Qualifying');
    fixture.detectChanges();
    const active = timer.activeSession()!.id;
    const other = timer.sessions().find((x) => x.id !== active)!;
    const rows = [...fixture.nativeElement.querySelectorAll('tr.session-row')] as HTMLElement[];
    const otherRow = rows.find((r) => r.textContent!.includes(other.name))!;

    otherRow.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

    expect(timer.activeSession()!.id).toBe(other.id);
  });
});
