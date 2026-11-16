import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientRule } from 'src/api/rules.api';
import { ConfirmOptions, ConfirmService } from 'src/ui/confirm/confirm.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { spinnerClass } from 'src/ui/recipes/spinner';
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  describe('focus after a delete', () => {
    const accept = async () => {
      fetchMock.mockImplementationOnce(() => json({}));
      confirm.confirm.mock.calls.at(-1)![0].accept?.();
      await settle();
    };
    const deleteButton = (id: string): HTMLButtonElement =>
      fixture.nativeElement.querySelector(`[aria-label="Delete rule ${id}"]`);

    it('moves to the next row, or the new last row, so focus never drops to the page', async () => {
      fixture.componentInstance.rules.set([rule('a', false), rule('b', false), rule('c', false)]);
      await settle();

      deleteButton('a').focus();
      deleteButton('a').click();
      await accept();
      expect(document.activeElement).toBe(deleteButton('b'));

      deleteButton('c').click();
      await accept();
      expect(document.activeElement).toBe(deleteButton('b'));
    });

    it('shows no ring on the moved focus after a mouse confirm, and a ring after a key press', async () => {
      for (const [event, ring] of [
        [new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }), false],
        [new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }), true]
      ] as const) {
        fixture.componentInstance.rules.set([rule('a', false), rule('b', false)]);
        await settle();
        const focus = vi.spyOn(HTMLElement.prototype, 'focus');
        deleteButton('a').click();
        document.dispatchEvent(event);
        await accept();
        expect(document.activeElement).toBe(deleteButton('b'));
        expect(focus).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: ring }));
        focus.mockRestore();
      }
    });

    it('asks the page to take focus when the last rule is gone', async () => {
      const emptied = vi.fn();
      fixture.componentInstance.emptiedByDelete.subscribe(emptied);
      deleteButton('hot').click();
      await accept();
      expect(emptied).toHaveBeenCalledTimes(1);
    });
  });

  it('selects rows from their checkboxes, and the header checkbox shows some, all or none', async () => {
    fixture.componentInstance.rules.set([rule('a', false), rule('b', false)]);
    await settle();
    const selected = vi.fn();
    fixture.componentInstance.selectionChanged.subscribe(selected);
    const box = (label: string): HTMLInputElement => fixture.nativeElement.querySelector(`[aria-label="${label}"]`);

    box('Select rule a').click();
    await settle();
    expect(box('Select all rules').indeterminate).toBe(true);
    expect(box('Select all rules').checked).toBe(false);
    expect(selected).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'a' })]);

    box('Select all rules').click();
    await settle();
    expect(box('Select all rules').checked).toBe(true);
    expect(box('Select all rules').indeterminate).toBe(false);
    expect(box('Select rule b').checked).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-label="Select rule b"]').closest('tr').dataset.selected).toBe('true');

    box('Select all rules').click();
    await settle();
    expect(selected).toHaveBeenLastCalledWith([]);
  });

  it("keeps 814's red header, with a select-all box drawn to show on it", () => {
    const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('th'));
    expect(headers.length).toBeGreaterThan(0);
    for (const th of headers) expect(th.classList).toContain('bg-accent-strong');
    const selectAll: HTMLInputElement = fixture.nativeElement.querySelector('[aria-label="Select all rules"]');
    expect(selectAll.classList).toContain('border-on-accent');
    expect(selectAll.classList).not.toContain('checked:bg-accent');
  });

  it('disables select-all while no rows are listed, so it never shows ticked over an empty table', async () => {
    const selectAll = (): HTMLInputElement => fixture.nativeElement.querySelector('[aria-label="Select all rules"]');
    expect(selectAll().disabled).toBe(false);

    fixture.componentRef.setInput('searchTerm', 'nothing');
    await settle();
    expect(selectAll().disabled).toBe(true);
    selectAll().click();
    await settle();
    expect(selectAll().checked).toBe(false);

    fixture.componentRef.setInput('searchTerm', '');
    fixture.componentInstance.rules.set([]);
    await settle();
    expect(selectAll().disabled).toBe(true);
    expect(selectAll().checked).toBe(false);
  });

  it('filters on expression, topic and id from the search term', async () => {
    fixture.componentInstance.rules.set([
      { ...rule('volts', false), topic: 'BMS/Pack/Voltage', expr: 'a > 400' },
      { ...rule('temp', false), topic: 'BMS/Status/Temp_Average', expr: 'a > 60' }
    ]);
    const ids = () => fixture.componentInstance.filteredRules().map((r) => r.id);
    for (const [term, expected] of [
      ['400', ['volts']],
      ['temp_avg', []],
      ['TEMP', ['temp']],
      ['volts', ['volts']]
    ] as const) {
      fixture.componentRef.setInput('searchTerm', term);
      await settle();
      expect(ids()).toEqual(expected);
    }
    fixture.componentRef.setInput('searchTerm', 'nothing');
    await settle();
    expect(fixture.nativeElement.textContent).toContain('No rules match your search.');
  });

  it("covers the rows with develop's loading mask and spinner on a reload, not only on the first load", async () => {
    const spinner = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[role="status"][aria-label="Loading rules"]');
    expect(spinner()).toBeNull();

    let respond!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => (respond = resolve)));
    const reload = fixture.componentInstance.loadRules();
    await settle();
    expect(spinner()).not.toBeNull();
    expect([...spinner()!.classList].sort()).toEqual(spinnerClass('sm').split(/\s+/).sort());
    expect(fixture.nativeElement.querySelector('[aria-label="Delete rule hot"]')).not.toBeNull();

    respond({ ok: true, json: () => Promise.resolve({ requesting_client_id: 'c', client_rules: [rule('hot', false)] }) });
    await reload;
    await settle();
    expect(spinner()).toBeNull();
  });

  it('drops rules that are gone from the selection when it reloads', async () => {
    const selected = vi.fn();
    fixture.componentInstance.selectionChanged.subscribe(selected);
    (fixture.nativeElement.querySelector('[aria-label="Select rule hot"]') as HTMLInputElement).click();
    await settle();
    fetchMock.mockImplementationOnce(() => json({ requesting_client_id: 'c', client_rules: [rule('cold', false)] }));
    await fixture.componentInstance.loadRules();
    expect(fixture.componentInstance.selectedRules()).toEqual([]);
    expect(selected).toHaveBeenLastCalledWith([]);
  });
});
