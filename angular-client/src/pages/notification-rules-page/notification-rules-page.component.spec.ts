import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import NotificationRulesPageComponent from './notification-rules-page.component';

describe('NotificationRulesPageComponent', () => {
  let component: NotificationRulesPageComponent;
  let fixture: ComponentFixture<NotificationRulesPageComponent>;
  let messageService: MessageService;

  beforeEach(async () => {
    // The real app eagerly creates the client ID in SocketService, which AppContextComponent injects at bootstrap;
    // the page only reads it.
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
      const addSpy = vi.spyOn(messageService, 'add').mockImplementation(() => undefined);
      const event = {
        target: {
          files: [new File(['test'], 'rules.txt', { type: 'text/plain' })],
          value: 'rules.txt'
        }
      } as unknown as Event;

      await component.onFileSelected(event);
      expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Invalid File' }));
    });

    const uploadedRules = async (csv: string): Promise<unknown> => {
      const openSpy = vi
        .spyOn(TestBed.inject(DialogService), 'open')
        .mockReturnValue({ onClose: of(false) } as unknown as DynamicDialogRef);
      const event = { target: { files: [new File([csv], 'rules.csv')], value: 'rules.csv' } } as unknown as Event;

      await component.onFileSelected(event);
      return (openSpy.mock.calls[0][1]?.data as { rules: unknown }).rules;
    };

    it('should import the optional description column', async () => {
      const rules = await uploadedRules('id,topic,expr,debounce_time,description\nr1,BMS/Pack,a > 5,10,Pack overvoltage');

      expect(rules).toEqual([
        { id: 'r1', topic: 'BMS/Pack', expr: 'a > 5', debounce_time: 10, description: 'Pack overvoltage' }
      ]);
    });

    it('should still import CSVs without a description column', async () => {
      const rules = await uploadedRules('id,topic,expr,debounce_time\nr1,BMS/Pack,a > 5,10');

      expect(rules).toEqual([{ id: 'r1', topic: 'BMS/Pack', expr: 'a > 5', debounce_time: 10 }]);
    });
  });

  describe('CSV download', () => {
    it('should export the description column', async () => {
      const clientRules = [
        {
          id: 'r1',
          topic: 'BMS/Pack',
          expr: 'a > 5',
          debounce_time: 10,
          description: 'Pack, overvoltage',
          uploaded_by: 'c'
        },
        { id: 'r2', topic: 'BMS/Cell', expr: 'a < 2', debounce_time: 5, description: null, uploaded_by: 'c' }
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ client_rules: clientRules, other_rules: [] }))
      );
      let blob: Blob | undefined;
      URL.createObjectURL = vi.fn((b: Blob) => {
        blob = b;
        return 'blob:rules';
      });
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      component.onDownload();
      await vi.waitFor(() => expect(blob).toBeDefined());

      expect(await blob?.text()).toBe(
        'id,topic,expr,debounce_time,description\nr1,BMS/Pack,a > 5,10,"Pack, overvoltage"\nr2,BMS/Cell,a < 2,5,'
      );
    });
  });
});
