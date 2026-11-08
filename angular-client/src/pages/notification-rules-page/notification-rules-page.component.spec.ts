import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ConfirmService } from 'src/ui/confirm/confirm.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject, map, Subject } from 'rxjs';
import NotificationRulesPageComponent from './notification-rules-page.component';
import { AddRuleDialogComponent } from './add-rule-dialog/add-rule-dialog.component';

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
  // Spec files in one worker share window (Vitest runs with isolate: false): leave storage empty.
  afterEach(() => {
    localStorage.removeItem('notification_rules_client_id');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate a client ID on init', () => {
    expect(component.clientId).toBeTruthy();
    expect(component.clientId.length).toBeGreaterThan(0);
  });

  it('fills View Log in the primary NER red, as on PrimeNG (white on accent-strong passes AA)', () => {
    const viewLog = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent?.trim() === 'View Log'
    );
    expect(viewLog?.dataset['variant']).toBe('primary');
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

  describe('Remove selected', () => {
    const selected = [
      { id: 'a', topic: 't', expr: 'a > 1', debounce_time: 1, subscribers: [], is_subscribed: false },
      { id: 'b', topic: 't', expr: 'a > 2', debounce_time: 1, subscribers: [], is_subscribed: false }
    ];

    it('asks through the app confirm dialog, and deletes nothing until accepted', async () => {
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      const fetchMock = vi.fn<(url: string) => Promise<Response>>(() => Promise.resolve({ ok: true } as Response));
      vi.stubGlobal('fetch', fetchMock);
      component.selectedRules.set(selected);
      fetchMock.mockClear();

      component.onRemoveSelected();
      const [[options]] = confirm.mock.calls;
      expect(options).toEqual(expect.objectContaining({ header: 'Delete Rules', danger: true }));
      expect(options.message).toContain('2');
      expect(fetchMock).not.toHaveBeenCalled();

      options.accept?.();
      await new Promise((resolve) => setTimeout(resolve));
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/delete')).length).toBe(2);
      vi.unstubAllGlobals();
    });

    it('clears the selection and moves focus to Add once the rules are deleted', async () => {
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ client_rules: [] }) }))
      );
      component.selectedRules.set(selected);
      fixture.detectChanges();

      component.onRemoveSelected();
      confirm.mock.calls[0][0].accept?.();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();

      expect(component.selectedRules()).toEqual([]);
      expect(document.activeElement?.textContent?.trim()).toBe('Add');
      expect(fixture.nativeElement.querySelector('argos-button[label="Remove"] button')?.disabled).toBe(true);
      vi.unstubAllGlobals();
    });

    it('shows no ring on Add after a mouse confirm, and a ring after a key press', async () => {
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ client_rules: [] }) }))
      );
      for (const [event, ring] of [
        [new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }), false],
        [new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }), true]
      ] as const) {
        component.selectedRules.set(selected);
        fixture.detectChanges();
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');
        component.onRemoveSelected();
        document.dispatchEvent(event);
        confirm.mock.calls.at(-1)![0].accept?.();
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        expect(document.activeElement?.textContent?.trim()).toBe('Add');
        expect(focus).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: ring }));
        focus.mockRestore();
      }
    });

    it('keeps the rules that failed selected, so the user can retry', async () => {
      const confirm = vi.spyOn(TestBed.inject(ConfirmService), 'confirm').mockReturnValue(undefined);
      const add = vi.spyOn(messageService, 'add').mockReturnValue(undefined);
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) =>
          Promise.resolve({ ok: !String(url).includes('/delete/b'), json: () => Promise.resolve({ client_rules: [] }) })
        )
      );
      component.selectedRules.set(selected);
      component.onRemoveSelected();
      confirm.mock.calls[0][0].accept?.();
      await new Promise((resolve) => setTimeout(resolve));
      expect(component.selectedRules().map((r) => r.id)).toEqual(['b']);
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Delete Error' }));
      vi.unstubAllGlobals();
    });
  });

  describe('Add rule', () => {
    it('opens the add dialog, and posts the rule it closes with, then reloads the table', async () => {
      const closed = new Subject<unknown>();
      const open = vi.spyOn(TestBed.inject(UiDialogService), 'open').mockReturnValue({ closed } as never);
      const fetchMock = vi.fn((url: string, init?: RequestInit) =>
        Promise.resolve({ ok: true, url, init, json: () => Promise.resolve({ client_rules: [] }), text: () => '' })
      );
      vi.stubGlobal('fetch', fetchMock);
      const reload = vi.spyOn(component.rulesTable()!, 'loadRules');
      const add = vi.spyOn(messageService, 'add').mockReturnValue(undefined);

      component.onAddRule();
      expect(open).toHaveBeenCalledWith(AddRuleDialogComponent, expect.objectContaining({ header: 'Add New Rule' }));
      closed.next({ id: 'hot', topic: 'BMS/Pack/Voltage', expr: 'a > 1', debounce_time: 5 });
      await new Promise((resolve) => setTimeout(resolve));

      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(post).toBeDefined();
      expect(JSON.parse(String(post![1]!.body))).toEqual(expect.objectContaining({ id: 'hot', topic: 'BMS/Pack/Voltage' }));
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Rule Added' }));
      expect(reload).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('posts nothing when the dialog is cancelled', async () => {
      const closed = new Subject<unknown>();
      vi.spyOn(TestBed.inject(UiDialogService), 'open').mockReturnValue({ closed } as never);
      const fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockClear();
      component.onAddRule();
      closed.next(null);
      await new Promise((resolve) => setTimeout(resolve));
      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});

describe('NotificationRulesPageComponent stream rail across the phone breakpoint', () => {
  afterEach(() => localStorage.removeItem('notification_rules_client_id'));
  it('shows a live, reachable stream on a phone even after it was hidden on a desktop', async () => {
    localStorage.setItem('notification_rules_client_id', 'test-client-id');
    const phone = new BehaviorSubject(false);
    const breakpoints: Partial<BreakpointObserver> = {
      observe: () => phone.pipe(map((matches): BreakpointState => ({ matches, breakpoints: {} })))
    };
    await TestBed.configureTestingModule({
      imports: [NotificationRulesPageComponent],
      providers: [ToastService, UiDialogService, { provide: BreakpointObserver, useValue: breakpoints }]
    }).compileComponents();
    const fixture = TestBed.createComponent(NotificationRulesPageComponent);
    fixture.detectChanges();
    const rail = (): HTMLElement => fixture.nativeElement.querySelector('aside[aria-label="Live notification stream"]');

    fixture.componentInstance.toggleStreamRail();
    fixture.detectChanges();
    expect(rail().getAttribute('aria-hidden')).toBe('true');
    expect(rail().inert).toBe(true);

    // narrowed to a phone: there is no toggle there, and the rail is shown, so it must be live too
    phone.next(true);
    fixture.detectChanges();
    expect(rail().getAttribute('aria-hidden')).toBe('false');
    expect(rail().inert).toBe(false);
  });
});
