import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDrawerComponent } from './drawer.component';

@Component({
  imports: [UiDrawerComponent],
  template: `
    <button class="trigger">Open</button>
    <ui-drawer [(visible)]="visible" ariaLabel="Topics" position="left" [dismissible]="dismissible()" [modal]="modal()">
      <span uiDrawerHeader>Header</span>
      <p class="body">Body</p>
    </ui-drawer>
  `
})
class Host {
  visible = signal(false);
  dismissible = signal(true);
  modal = signal(true);
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('UiDrawerComponent', () => {
  const setup = async ({ modal = true } = {}) => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.modal.set(modal);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const open = async () => {
      fixture.componentInstance.visible.set(true);
      await fixture.whenStable();
      await settle();
    };
    return { fixture, open };
  };
  const container = () => document.querySelector<HTMLElement>('[role="dialog"]');

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('opens as a named dialog over a scrim with its header and body when visible', async () => {
    const { open } = await setup();
    await open();
    expect(container()?.getAttribute('role')).toBe('dialog');
    expect(container()?.getAttribute('aria-label')).toBe('Topics');
    expect(document.querySelector('.cdk-overlay-backdrop')).not.toBeNull();
    expect(container()?.textContent).toContain('Header');
    expect(container()?.querySelector('.body')).not.toBeNull();
  });

  it('closes on Escape and writes visible back to false', async () => {
    const { fixture, open } = await setup();
    await open();
    container()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.visible()).toBe(false);
    expect(container()).toBeNull();
  });

  it('closes from the scrim when dismissible, and keeps open when not', async () => {
    const { fixture, open } = await setup();
    await open();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.visible()).toBe(false);

    fixture.componentInstance.dismissible.set(false);
    await open();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('gives focus back to the element that opened it', async () => {
    const { fixture, open } = await setup();
    const trigger = fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
    trigger.focus();
    await open();
    expect(container()!.contains(document.activeElement)).toBe(true);
    container()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await fixture.whenStable();
    await settle();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from its Close button', async () => {
    const { fixture, open } = await setup();
    await open();
    container()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('closes when its host is destroyed while open', async () => {
    const { fixture, open } = await setup();
    await open();
    expect(container()).not.toBeNull();
    fixture.destroy();
    await settle();
    expect(container()).toBeNull();
    expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
    // The CDK gives the page back to assistive tech once the last dialog closes.
    expect(document.querySelector('body > [aria-hidden="true"]')).toBeNull();
  });

  describe('non-modal', () => {
    it('opens as a named dialog without a scrim, aria-modal, aria-hidden page or focus trap', async () => {
      const { fixture, open } = await setup({ modal: false });
      await open();
      expect(container()?.getAttribute('aria-label')).toBe('Topics');
      expect(container()?.querySelector('.body')).not.toBeNull();
      expect(container()?.getAttribute('aria-modal')).not.toBe('true');
      expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
      // The page behind stays visible to assistive tech, and Tab can leave the drawer.
      expect(fixture.nativeElement.closest('[aria-hidden="true"]')).toBeNull();
      expect(document.querySelector('.cdk-focus-trap-anchor')).toBeNull();
    });

    it('takes focus on open, and gives it back to the trigger on Escape', async () => {
      const { fixture, open } = await setup({ modal: false });
      const trigger = fixture.nativeElement.querySelector('.trigger') as HTMLButtonElement;
      trigger.focus();
      await open();
      expect(container()!.contains(document.activeElement)).toBe(true);
      container()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      await fixture.whenStable();
      await settle();
      expect(fixture.componentInstance.visible()).toBe(false);
      expect(container()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('closes from its Close button and when visible is set back to false', async () => {
      const { fixture, open } = await setup({ modal: false });
      await open();
      container()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
      await fixture.whenStable();
      await settle();
      expect(fixture.componentInstance.visible()).toBe(false);
      expect(container()).toBeNull();

      await open();
      fixture.componentInstance.visible.set(false);
      await fixture.whenStable();
      await settle();
      expect(container()).toBeNull();
    });

    it('closes when its host is destroyed while open', async () => {
      const { fixture, open } = await setup({ modal: false });
      await open();
      fixture.destroy();
      await settle();
      expect(container()).toBeNull();
    });
  });
});
