import { DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiPanelRef } from './panel.component';
import { UiDialogService } from './dialog.service';

@Component({ template: `<input aria-label="Name" /><span class="data">{{ data }}</span>` })
class Content {
  data = inject(DIALOG_DATA);
}

const settle = () => new Promise((resolve) => setTimeout(resolve));
const escape = (target: EventTarget) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

describe('UiDialogService', () => {
  let service: UiDialogService;

  beforeEach(() => (service = TestBed.inject(UiDialogService)));
  afterEach(() => service.closeAll());

  const dialog = () => document.querySelector<HTMLElement>('ui-dialog-container');

  it('opens a modal dialog labelled by its header, with the data and a Close button', async () => {
    service.open(Content, { header: 'Edit Rule', data: 'payload' });
    await settle();
    const el = dialog()!;
    expect(el.getAttribute('role')).toBe('dialog');
    // Modal: a backdrop, and the CDK hides the page behind from assistive tech.
    expect(document.querySelector('.ui-dialog-backdrop')).not.toBeNull();
    expect(document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent).toBe('Edit Rule');
    expect(el.querySelector('.data')?.textContent).toBe('payload');
    expect(el.querySelector('button[aria-label="Close"]')).not.toBeNull();
  });

  it('closes on Escape and on the Close button when closable', async () => {
    const closed = vi.fn();
    service.open(Content, { header: 'A' }).closed.subscribe(closed);
    await settle();
    escape(dialog()!);
    await settle();
    expect(closed).toHaveBeenCalledTimes(1);

    service.open(Content, { header: 'B' }).closed.subscribe(closed);
    await settle();
    dialog()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await settle();
    expect(closed).toHaveBeenCalledTimes(2);
  });

  it('keeps a non-closable dialog open on Escape, without a Close button', async () => {
    const ref = service.open(Content, { header: 'Locked', closable: false });
    const closed = vi.fn();
    ref.closed.subscribe(closed);
    await settle();
    escape(dialog()!);
    await settle();
    expect(closed).not.toHaveBeenCalled();
    expect(dialog()!.querySelector('button[aria-label="Close"]')).toBeNull();
  });

  it('uses alertdialog and aria-describedby for confirmations', async () => {
    service.open(Content, { ariaLabel: 'Confirm', role: 'alertdialog', ariaDescribedBy: 'msg', showHeader: false });
    await settle();
    expect(dialog()!.getAttribute('role')).toBe('alertdialog');
    expect(dialog()!.getAttribute('aria-label')).toBe('Confirm');
    expect(dialog()!.getAttribute('aria-describedby')).toBe('msg');
  });

  describe('openPanel', () => {
    it('opens a non-modal dialog the page stays usable behind, closed by Escape', async () => {
      const ref: UiPanelRef = service.openPanel(Content, { header: 'Graph', data: 'p' });
      const closed = vi.fn();
      ref.closed.subscribe(closed);
      await settle();
      const panel = document.querySelector<HTMLElement>('ui-panel')!;
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
      expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe('Graph');

      escape(panel);
      await settle();
      expect(closed).toHaveBeenCalledTimes(1);
      expect(document.querySelector('ui-panel')).toBeNull();
    });
  });
});
