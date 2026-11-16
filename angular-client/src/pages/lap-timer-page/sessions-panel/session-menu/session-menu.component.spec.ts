import { MenuHarness } from '@angular/aria/menu/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionAction, SessionMenuComponent } from './session-menu.component';

// The menu sits in a clickable session row, so its clicks must not reach the row.
@Component({
  imports: [SessionMenuComponent],
  template: `<div class="row" (click)="rowClicks = rowClicks + 1"><session-menu (action)="actions.push($event)" /></div>`
})
class Host {
  actions: SessionAction[] = [];
  rowClicks = 0;
}

describe('SessionMenuComponent', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const key = (target: Element, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  // An item's label, without its icon's ligature text.
  const label = (item: Element) => [...item.querySelectorAll('span')].at(-1)?.textContent?.trim();
  const focusedText = () => label(document.activeElement!);

  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const menu = () => TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(MenuHarness);
    return { fixture, trigger, menu };
  };
  const openByKeyboard = async (fixture: { whenStable(): Promise<unknown> }, trigger: HTMLButtonElement) => {
    trigger.focus();
    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    await settle();
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('opens a menu of the session actions from its named trigger, without clicking the row', async () => {
    const { fixture, trigger, menu } = await setup();
    expect(trigger.getAttribute('aria-label')).toBe('Session actions');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(await (await menu()).getItems()).toHaveLength(3);
    expect([...document.querySelectorAll('[role="menuitem"]')].map(label)).toEqual(['Rename', 'Download CSV', 'Delete']);
    expect(fixture.componentInstance.rowClicks).toBe(0);
  });

  it('emits the clicked action and closes', async () => {
    const { fixture, trigger, menu } = await setup();
    trigger.click();
    await fixture.whenStable();
    const items = await (await menu()).getItems();
    await items[1].click();
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.actions).toEqual(['download']);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.rowClicks).toBe(0);
  });

  it('moves through the items with the arrow keys and typeahead, and picks one with Enter', async () => {
    const { fixture, trigger } = await setup();
    await openByKeyboard(fixture, trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement!.getAttribute('role')).toBe('menuitem');
    expect(focusedText()).toBe('Rename');
    key(document.activeElement!, 'ArrowDown');
    await fixture.whenStable();
    expect(focusedText()).toBe('Download CSV');
    key(document.activeElement!, 'd');
    await fixture.whenStable();
    expect(focusedText()).toBe('Delete');
    key(document.activeElement!, 'Enter');
    await fixture.whenStable();
    await settle();
    expect(fixture.componentInstance.actions).toEqual(['delete']);
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { fixture, trigger } = await setup();
    await openByKeyboard(fixture, trigger);
    key(document.activeElement!, 'Escape');
    await fixture.whenStable();
    await settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.actions).toEqual([]);
  });
});
