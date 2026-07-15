import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import NotificationRulesPageComponent from './notification-rules-page.component';

describe('NotificationRulesPageComponent', () => {
  let component: NotificationRulesPageComponent;
  let fixture: ComponentFixture<NotificationRulesPageComponent>;
  let messageService: MessageService;

  beforeEach(async () => {
    // The real app eagerly creates the client ID in AppContextComponent; the page only reads it.
    localStorage.setItem('notification_rules_client_id', 'test-client-id');

    await TestBed.configureTestingModule({
      imports: [NotificationRulesPageComponent],
      providers: [MessageService, DialogService]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationRulesPageComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
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
      const addSpy = spyOn(messageService, 'add');
      const event = {
        target: {
          files: [new File(['test'], 'rules.txt', { type: 'text/plain' })],
          value: 'rules.txt'
        }
      } as unknown as Event;

      await component.onFileSelected(event);
      expect(addSpy).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', summary: 'Invalid File' }));
    });
  });
});
