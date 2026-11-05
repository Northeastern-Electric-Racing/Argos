import { MenuHarness } from '@angular/aria/menu/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

import { NavOptionsMenuComponent } from './nav-options-menu.component';

describe('NavOptionsMenuComponent', () => {
  let fixture: ComponentFixture<NavOptionsMenuComponent>;
  let clicked: string[];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  beforeEach(async () => {
    clicked = [];
    const item = (id: string, label: string): NavItem => ({ id, label, icon: 'map', onClick: () => clicked.push(id) });
    fixture = TestBed.createComponent(NavOptionsMenuComponent);
    fixture.componentRef.setInput('items', [item('/faults', 'Fault'), item('/map', 'Map'), item('', 'Edit Runs')]);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  const trigger = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const menu = () => TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(MenuHarness);

  it('has a named trigger that reports the menu it opens', async () => {
    expect(trigger().getAttribute('aria-label')).toBe('More pages');
    expect(['true', 'menu']).toContain(trigger().getAttribute('aria-haspopup'));
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    trigger().click();
    await fixture.whenStable();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('lists every page as a menu item and runs the chosen one', async () => {
    trigger().click();
    await fixture.whenStable();
    const items = await (await menu()).getItems();
    expect(await Promise.all(items.map((i) => i.getText()))).toEqual(['Fault', 'Map', 'Edit Runs']);
    await items[1].click();
    await fixture.whenStable();
    expect(clicked).toEqual(['/map']);
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    trigger().focus();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    await settle();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const active = document.activeElement as HTMLElement;
    expect(active.getAttribute('role')).toBe('menuitem');
    active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    await settle();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('moves between items with the arrow keys and jumps by typeahead', async () => {
    trigger().focus();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    await settle();
    const focused = () => (document.activeElement as HTMLElement).textContent?.trim();
    expect(focused()).toBe('Fault');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(focused()).toBe('Map');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    await fixture.whenStable();
    expect(focused()).toBe('Edit Runs');
  });
});
