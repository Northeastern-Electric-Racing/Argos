import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDrawerComponent } from './drawer.component';

@Component({
  imports: [UiDrawerComponent],
  template: `
    <button class="trigger">Open</button>
    <ui-drawer [(visible)]="visible" ariaLabel="Topics" position="left" [dismissible]="dismissible()">
      <span uiDrawerHeader>Header</span>
      <p class="body">Body</p>
    </ui-drawer>
  `
})
class Host {
  visible = signal(false);
  dismissible = signal(true);
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('UiDrawerComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
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
});
