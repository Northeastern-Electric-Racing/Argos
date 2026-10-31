import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnDialog, BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { ConfirmService } from 'src/services/confirm.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let service: ConfirmService;
  let accept: ReturnType<typeof vi.fn<() => void>>;

  const alertDialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
  const button = (label: string) =>
    Array.from(alertDialog()?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === label);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    service = TestBed.inject(ConfirmService);
    accept = vi.fn<() => void>();
    service.confirm({ header: 'Delete Rule', message: 'Delete rule r1?', acceptLabel: 'Delete', destructive: true, accept });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => service.answer(false));

  it('shows the question in an alert dialog', () => {
    expect(alertDialog()?.textContent).toContain('Delete Rule');
    expect(alertDialog()?.textContent).toContain('Delete rule r1?');
  });

  it('runs accept once when the user says yes', () => {
    button('Delete')?.click();
    expect(accept).toHaveBeenCalledTimes(1);
    expect(service.pending()).toBeNull();
  });

  it('focuses the fallback when accepting removed the control that asked', async () => {
    service.answer(false);
    const trigger = document.body.appendChild(document.createElement('button'));
    const fallback = document.body.appendChild(document.createElement('button'));
    trigger.focus();
    service.confirm({
      header: 'Delete Rule',
      message: 'Delete rule r1?',
      acceptLabel: 'Delete',
      accept: () => trigger.remove(),
      focusFallback: () => fallback
    });
    await TestBed.inject(ApplicationRef).whenStable();

    button('Delete')?.click();
    await vi.waitFor(() => expect(alertDialog()).toBeNull());
    await TestBed.inject(ApplicationRef).whenStable();

    expect(document.activeElement).toBe(fallback);
    fallback.remove();
  });

  it('shows a question asked in the same tick as the previous answer', async () => {
    button('Cancel')?.click();
    service.confirm({ header: 'Clear All Sessions', message: 'Delete all sessions?', accept });
    await vi.waitFor(() => expect(alertDialog()?.textContent).toContain('Clear All Sessions'));

    button('Confirm')?.click();
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('does not run accept on cancel', () => {
    button('Cancel')?.click();
    expect(accept).not.toHaveBeenCalled();
    expect(service.pending()).toBeNull();
  });
});

@Component({ selector: 'other-dialog', template: '<p>Presets</p>' })
class OtherDialogComponent {}

describe('ConfirmDialogComponent inside a dialog opened by HlmDialogService', () => {
  const alertDialog = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
  const opened: BrnDialogRef[] = [];

  afterEach(() => {
    TestBed.inject(ConfirmService).answer(false);
    opened.forEach((ref) => ref.close());
    opened.length = 0;
  });

  it('still shows the question, whatever id the open dialog was given', async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    const confirmId = fixture.debugElement.query(By.directive(BrnDialog)).injector.get(BrnDialog).id();

    // Brain numbers template dialogs and service dialogs with separate counters in the same
    // brn-dialog-N format, so open service dialogs until one would take the confirm's id.
    const dialogs = TestBed.inject(HlmDialogService);
    for (let i = 0; i < 50; i++) {
      const ref = dialogs.open(OtherDialogComponent);
      opened.push(ref);
      if (ref.id === confirmId) break;
    }

    const accept = vi.fn<() => void>();
    TestBed.inject(ConfirmService).confirm({ header: 'Delete Preset', message: 'Delete preset p1?', accept });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(alertDialog()?.textContent).toContain('Delete Preset');
  });
});
