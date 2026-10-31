import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDrawerComponent } from './drawer.component';

@Component({
  imports: [UiDrawerComponent],
  template: `
    <ui-drawer [(visible)]="visible" ariaLabel="Topics" position="left">
      <span uiDrawerHeader>Header</span>
      <p class="body">Body</p>
    </ui-drawer>
  `
})
class Host {
  visible = signal(false);
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('UiDrawerComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const open = async () => {
      fixture.componentInstance.visible.set(true);
      await fixture.whenStable();
      await settle();
    };
    return { fixture, open };
  };
  const container = () => document.querySelector<HTMLElement>('.ui-drawer-pane .cdk-dialog-container');

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('opens as a named modal dialog with its header and body when visible', async () => {
    const { open } = await setup();
    await open();
    expect(container()?.getAttribute('role')).toBe('dialog');
    expect(container()?.getAttribute('aria-label')).toBe('Topics');
    expect(document.querySelector('.ui-drawer-pane--left')).not.toBeNull();
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

  it('closes from its Close button', async () => {
    const { fixture, open } = await setup();
    await open();
    container()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.visible()).toBe(false);
  });
});
