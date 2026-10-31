import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientRule } from 'src/api/rules.api';
import { ConfirmOptions, ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { RulesTableComponent } from './rules-table.component';

const rule = (id: string, is_subscribed: boolean): ClientRule => ({
  id,
  topic: 'BMS/Pack/Voltage',
  expr: 'a > 1',
  debounce_time: 5,
  subscribers: [],
  is_subscribed
});

const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body), text: () => Promise.resolve('') });

describe('RulesTableComponent', () => {
  let fixture: ComponentFixture<RulesTableComponent>;
  let fetchMock: Mock;
  let toast: { add: Mock };
  let confirm: { confirm: Mock };
  /** Lets the pending fetch promises settle, then renders. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fetchMock = vi.fn(() => json({ requesting_client_id: 'c', client_rules: [rule('hot', false)] }));
    vi.stubGlobal('fetch', fetchMock);
    toast = { add: vi.fn() };
    confirm = { confirm: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RulesTableComponent],
      providers: [
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: confirm }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RulesTableComponent);
    fixture.componentRef.setInput('clientId', 'c');
    fixture.detectChanges();
    await settle();
  });

  afterEach(() => vi.unstubAllGlobals());

  const switchEl = (): HTMLButtonElement => fixture.nativeElement.querySelector('[role="switch"]');

  it('shows the switch on while the subscribe request is in flight', async () => {
    let respond!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (respond = resolve)));

    switchEl().click();
    await settle();
    expect(switchEl().getAttribute('aria-checked')).toBe('true');

    respond({ ok: true });
    await settle();
    expect(switchEl().getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.rules()[0].is_subscribed).toBe(true);
  });

  it('turns the switch back off when the subscribe request fails', async () => {
    let respond!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (respond = resolve)));

    switchEl().click();
    await settle();
    respond({ ok: false });
    await settle();

    expect(switchEl().getAttribute('aria-checked')).toBe('false');
    expect(fixture.componentInstance.rules()[0].is_subscribed).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('turns the switch back off on a network error', async () => {
    let fail!: (reason: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)));

    switchEl().click();
    await settle();
    fail(new TypeError('offline'));
    await settle();

    expect(switchEl().getAttribute('aria-checked')).toBe('false');
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Network error' }));
  });

  it('asks through the app confirm dialog before deleting a rule, and deletes on accept', async () => {
    const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Delete rule hot"]');
    deleteButton.click();

    expect(confirm.confirm).toHaveBeenCalledTimes(1);
    const [[options]] = confirm.confirm.mock.calls as [[ConfirmOptions]];
    expect(options.message).toContain('hot');
    expect(options.danger).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementationOnce(() => json({}));
    options.accept?.();
    await settle();
    expect(fixture.componentInstance.rules()).toEqual([]);
  });

  it('keeps the rule when the delete is rejected', async () => {
    (fixture.nativeElement.querySelector('[aria-label="Delete rule hot"]') as HTMLButtonElement).click();
    confirm.confirm.mock.calls[0][0].reject?.();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.rules().length).toBe(1);
  });
});
