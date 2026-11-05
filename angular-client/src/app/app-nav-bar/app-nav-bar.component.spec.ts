import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import SidebarService from 'src/services/sidebar.service';
import { AppNavBarComponent } from './app-nav-bar.component';

@Component({ template: '' })
class Blank {}

/** A page with its own mobile menu button (landing, charging, map). */
@Component({
  template: '<sidebar-toggle><button type="button">Open navigation</button></sidebar-toggle>',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class WithToggle {}

/** The nav bar and the routed page in their main region, as app-context lays them out. */
@Component({
  template: '<app-nav-bar /><main class="contents"><router-outlet /></main>',
  imports: [AppNavBarComponent, RouterOutlet]
})
class Shell {}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('AppNavBarComponent on a phone', () => {
  const realWidth = window.innerWidth;
  beforeEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 }));
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: realWidth });
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  const setup = async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'landing', component: Blank },
          { path: 'graph', component: Blank },
          { path: 'charging', component: WithToggle }
        ])
      ]
    });
    const fixture = TestBed.createComponent(Shell);
    document.body.appendChild(fixture.nativeElement);
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const drawer = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Navigation"]');
    const open = async () => {
      TestBed.inject(SidebarService).openSidebar();
      await fixture.whenStable();
      await settle();
    };
    const choose = async (label: string) => {
      const item = [...drawer()!.querySelectorAll<HTMLButtonElement>('sidebar-chip button')].find(
        (b) => b.textContent?.trim() === label
      )!;
      item.focus();
      item.click();
      await fixture.whenStable();
      await settle();
    };
    return { fixture, drawer, open, choose, main };
  };

  it('shows no desktop bar, and opens the nav drawer from the sidebar service', async () => {
    const { fixture, drawer, open } = await setup();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(drawer()).toBeNull();
    await open();
    expect(drawer()).not.toBeNull();
  });

  it('lists every page in the drawer as a button, marking the current one', async () => {
    const { drawer, open } = await setup();
    await TestBed.inject(Router).navigateByUrl('/graph');
    await open();
    const buttons = [...drawer()!.querySelectorAll<HTMLButtonElement>('sidebar-chip button')];
    expect(buttons.map((b) => b.textContent?.trim())).toContain('Lap Timer');
    expect(buttons.filter((b) => b.getAttribute('aria-current') === 'page').map((b) => b.textContent?.trim())).toEqual([
      'Graph'
    ]);
  });

  it('closes the drawer once a nav item has navigated', async () => {
    const { fixture, drawer, open } = await setup();
    await open();
    const graph = [...drawer()!.querySelectorAll<HTMLButtonElement>('sidebar-chip button')].find(
      (b) => b.textContent?.trim() === 'Graph'
    )!;
    graph.click();
    await fixture.whenStable();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/graph');
    expect(drawer()).toBeNull();
  });

  it('moves focus to the new page in the main region when that page has no menu button', async () => {
    const { drawer, open, choose, main } = await setup();
    await open();
    await choose('Graph');
    expect(drawer()).toBeNull();
    const page = main.querySelector<HTMLElement>('router-outlet + *')!;
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(page);
    // focusable only while it holds focus, like a skip link's target
    page.blur();
    expect(page.hasAttribute('tabindex')).toBe(false);
  });

  it("moves focus to the new page's menu button when it has one", async () => {
    const { fixture, open, choose, main } = await setup();
    await open();
    await choose('Charging');
    expect(main.querySelector('sidebar-toggle')).not.toBeNull();
    await fixture.whenStable();
    const toggle = document.querySelector<HTMLElement>('sidebar-toggle button');
    expect(toggle).not.toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});

describe('AppNavBarComponent on a desktop', () => {
  const realWidth = window.innerWidth;
  beforeEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 }));
  afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: realWidth }));

  it('draws the clock and its "Run #N" partner on one readout size, as 814 drew both at 36px', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
    const run = [...nav.querySelectorAll<HTMLElement>('current-run-display p')];
    const clock = [...nav.querySelectorAll<HTMLElement>('typography p')].find((p) =>
      /^\d\d:\d\d:\d\d$/.test(p.textContent!.trim())
    )!;
    expect(run.map((p) => p.textContent?.trim())).toEqual(['Run', '#0']);
    expect(clock).toBeDefined();
    for (const p of [clock, ...run]) {
      expect(p.classList).toContain('text-readout');
      expect(p.getAttribute('style') ?? '').not.toMatch(/font-?size/i);
    }
  });
});
