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
    expect(document.querySelector('.cdk-overlay-backdrop')).not.toBeNull();
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

  // Initial focus on the first field needs layout (the CDK skips invisible elements); focus-walk.js checks it.
  it('gives focus back to the trigger when it closes', async () => {
    const trigger = document.body.appendChild(document.createElement('button'));
    trigger.focus();
    service.open(Content, { header: 'Add' });
    await settle();
    escape(dialog()!);
    await settle();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('puts each class of a recipe-style panelClass on the pane, from a string or an array', async () => {
    // classList.add('a b') throws InvalidCharacterError: the CDK needs one class per array item (lesson)
    expect(() => service.open(Content, { header: 'A', panelClass: 'pane-a  pane-b' })).not.toThrow();
    service.open(Content, { header: 'B', panelClass: ['pane-c', 'pane-d pane-e'] });
    await settle();
    const panes = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane')];
    for (const c of ['pane-a', 'pane-b', 'pane-c', 'pane-d', 'pane-e'])
      expect(panes.some((p) => p.classList.contains(c))).toBe(true);
  });

  it('closes on a backdrop click only with dismissableMask', async () => {
    const kept = vi.fn();
    service.open(Content, { header: 'Kept' }).closed.subscribe(kept);
    await settle();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await settle();
    expect(kept).not.toHaveBeenCalled();
    service.closeAll();
    await settle();

    const dismissed = vi.fn();
    service.open(Content, { header: 'Dismissed', dismissableMask: true }).closed.subscribe(dismissed);
    await settle();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await settle();
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });

  it('drags by its header only when draggable', async () => {
    service.open(Content, { header: 'Fixed' });
    await settle();
    expect(dialog()!.querySelector('.cdk-drag')!.classList).toContain('cdk-drag-disabled');
    expect(dialog()!.querySelector('header')!.classList).not.toContain('cursor-move');
    service.closeAll();
    await settle();

    service.open(Content, { header: 'Moves', draggable: true });
    await settle();
    const header = dialog()!.querySelector<HTMLElement>('header')!;
    expect(dialog()!.querySelector('.cdk-drag')!.classList).not.toContain('cdk-drag-disabled');
    expect([...header.classList]).toEqual(expect.arrayContaining(['cdk-drag-handle', 'cursor-move']));
    // The CDK moves the whole pane (cdkDragRootElement), past its 5px start threshold. buttons and detail tell
    // a real press from a screen reader's fake one.
    header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10, buttons: 1, detail: 1 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 60, clientY: 40 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 70, clientY: 50 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 70, clientY: 50 }));
    await settle();
    expect(dialog()!.closest<HTMLElement>('.cdk-overlay-pane')!.style.transform).toContain('translate3d(60px, 40px');
  });

  it('pins to the viewport edges given by position instead of centring', async () => {
    service.open(Content, { header: 'Pinned', position: { top: '12px', right: '8px' } });
    await settle();
    const pane = dialog()!.closest<HTMLElement>('.cdk-overlay-pane')!;
    const wrapper = pane.parentElement!;
    expect(pane.style.marginTop).toBe('12px');
    expect(pane.style.marginRight).toBe('8px');
    expect(wrapper.style.alignItems).toBe('flex-start');
    expect(wrapper.style.justifyContent).toBe('flex-end');
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

    it('can be compact, with the same header, close button and labelling', async () => {
      const ref = service.openPanel(Content, { header: 'Cell Comparison', compact: true, draggable: true });
      await settle();
      const panel = document.querySelector<HTMLElement>('ui-panel')!;
      expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe('Cell Comparison');
      panel.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
      await settle();
      expect(document.querySelector('ui-panel')).toBeNull();
      ref.close();
    });

    it('splits a panelClass string into classes, as open() does', async () => {
      let ref: UiPanelRef | undefined;
      expect(() => (ref = service.openPanel(Content, { header: 'P', panelClass: 'pane-f pane-g' }))).not.toThrow();
      await settle();
      const pane = document.querySelector<HTMLElement>('ui-panel')!.closest('.cdk-overlay-pane')!;
      expect([...pane.classList]).toEqual(expect.arrayContaining(['pane-f', 'pane-g']));
      ref!.close();
    });

    describe('focus on close', () => {
      let page: HTMLElement;
      let trigger: HTMLButtonElement;
      let other: HTMLButtonElement;
      beforeEach(() => {
        page = document.body.appendChild(document.createElement('div'));
        const group = page.appendChild(document.createElement('div'));
        trigger = group.appendChild(document.createElement('button'));
        other = group.appendChild(document.createElement('button'));
        trigger.focus();
      });
      afterEach(() => page.remove());
      const openFromTrigger = async () => {
        const ref = service.openPanel(Content, { header: 'Cell Comparison' });
        await settle();
        const panel = document.querySelector<HTMLElement>('ui-panel')!;
        panel.querySelector<HTMLInputElement>('input')!.focus();
        return { ref, panel };
      };

      it('gives focus back to the element that opened it, from the Close button', async () => {
        const { panel } = await openFromTrigger();
        panel.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
        await settle();
        expect(document.activeElement).toBe(trigger);
      });

      it('gives focus back to the element that opened it, from Escape', async () => {
        const { panel } = await openFromTrigger();
        escape(panel.querySelector('input')!);
        await settle();
        expect(document.activeElement).toBe(trigger);
      });

      it('leaves focus where it is when the page closed it from outside the panel', async () => {
        const { ref } = await openFromTrigger();
        other.focus();
        ref.close();
        await settle();
        expect(document.activeElement).toBe(other);
      });

      it('falls back to the nearest focusable element where the opener was, once the opener is gone', async () => {
        const { panel } = await openFromTrigger();
        trigger.remove();
        panel.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
        await settle();
        expect(document.activeElement).toBe(other);
      });

      it('falls back to the first focusable element on the page when the area around the opener is gone too', async () => {
        const first = document.body.insertBefore(document.createElement('button'), document.body.firstChild);
        const { panel } = await openFromTrigger();
        page.firstElementChild!.remove();
        panel.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
        await settle();
        expect(document.activeElement).toBe(first);
        first.remove();
      });
    });
  });
});
