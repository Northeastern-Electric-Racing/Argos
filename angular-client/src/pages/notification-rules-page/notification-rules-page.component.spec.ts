import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import NotificationRulesPageComponent from './notification-rules-page.component';

describe('NotificationRulesPageComponent', () => {
  let component: NotificationRulesPageComponent;
  let fixture: ComponentFixture<NotificationRulesPageComponent>;
  let messageService: ToastService;

  beforeEach(async () => {
    // The real app eagerly creates the client ID in SocketService, which AppContextComponent injects at bootstrap;
    // the page only reads it.
    localStorage.setItem('notification_rules_client_id', 'test-client-id');

    await TestBed.configureTestingModule({
      imports: [NotificationRulesPageComponent],
      providers: [ToastService, UiDialogService]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationRulesPageComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate a client ID on init', () => {
    expect(component.clientId).toBeTruthy();
    expect(component.clientId.length).toBeGreaterThan(0);
  });

  it('should persist client ID across instances', () => {
    const firstId = component.clientId;
    // Create a new instance
    const fixture2 = TestBed.createComponent(NotificationRulesPageComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    expect(component2.clientId).toBe(firstId);
  });

  describe('CSV parsing', () => {
    it('should reject files without .csv extension', async () => {
      const addSpy = vi.spyOn(messageService, 'add').mockReturnValue(undefined);
      const event = {
        target: {
          files: [new File(['test'], 'rules.txt', { type: 'text/plain' })],
          value: 'rules.txt'
        }
      } as unknown as Event;

      await component.onFileSelected(event);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Invalid File' }));
    });
  });
});
