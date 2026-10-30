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
});
