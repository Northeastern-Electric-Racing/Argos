import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
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

/** A page whose button navigates in-app and leaves with the page (BMS "See more", the segment selector). */
let linkTarget = '/graph';
@Component({ template: '<button type="button" (click)="go()">See more</button>' })
class Linker {
  private router = inject(Router);
  go() {
    void this.router.navigateByUrl(linkTarget);
  }
}

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
          { path: 'charging', component: WithToggle },
          { path: 'link', component: Linker },
          { path: 'notification-log', component: Blank },
          { path: 'bms/segment/:id', component: Blank }
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
    // named after the chosen page while it holds focus, not after its whole content
    expect(page.getAttribute('role')).toBe('group');
    expect(page.getAttribute('aria-label')).toBe('Graph');
    // focusable and named only while it holds focus, like a skip link's target
    page.blur();
    expect(page.hasAttribute('tabindex')).toBe(false);
    expect(page.hasAttribute('aria-label')).toBe(false);
    expect(page.hasAttribute('role')).toBe(false);
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

describe('AppNavBarComponent after an in-app navigation', () => {
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  const setup = async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'landing', component: Blank },
          { path: 'graph', component: Blank },
          { path: 'charging', component: WithToggle },
          { path: 'link', component: Linker },
          { path: 'notification-log', component: Blank },
          { path: 'bms/segment/:id', component: Blank }
        ])
      ]
    });
    const fixture = TestBed.createComponent(Shell);
    document.body.appendChild(fixture.nativeElement);
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/landing');
    await fixture.whenStable();
    /** Opens the Linker page and presses its button, which navigates to `to` and leaves with the page. */
    const follow = async (to: string) => {
      linkTarget = to;
      await router.navigateByUrl('/link');
      await fixture.whenStable();
      const button = main.querySelector<HTMLButtonElement>('button')!;
      button.focus();
      button.click();
      await fixture.whenStable();
      await settle();
      expect(router.url).toBe(to);
    };
    const page = () => main.querySelector<HTMLElement>('router-outlet + *')!;
    return { fixture, router, follow, page, main };
  };

  it('moves focus from a control that left with the old page to the new page, named after it', async () => {
    const { follow, page } = await setup();
    await follow('/graph');
    expect(document.activeElement).toBe(page());
    expect(page().getAttribute('aria-label')).toBe('Graph');
    page().blur();
    expect(page().hasAttribute('tabindex')).toBe(false);
    expect(page().hasAttribute('aria-label')).toBe(false);
  });

  it('names a page outside the nav after the page (notification log, a BMS segment)', async () => {
    const { follow, page } = await setup();
    await follow('/notification-log');
    expect(page().getAttribute('aria-label')).toBe('Notification Log');
    await follow('/bms/segment/3');
    expect(page().getAttribute('aria-label')).toBe('BMS Segment 3');
  });

  it("moves focus to the new page's menu button when it has one", async () => {
    const { follow } = await setup();
    await follow('/charging');
    expect(document.activeElement).toBe(document.querySelector('sidebar-toggle button'));
  });

  it('leaves focus alone when it is still on something that stayed (the nav bar, a control of the page)', async () => {
    const { fixture, router } = await setup();
    const kept = document.createElement('button');
    document.body.appendChild(kept);
    kept.focus();
    await router.navigateByUrl('/graph');
    await fixture.whenStable();
    await settle();
    expect(document.activeElement).toBe(kept);
    kept.remove();
  });

  it('leaves focus alone on the first navigation (page load)', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'graph', component: Blank }])] });
    const fixture = TestBed.createComponent(Shell);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    (document.activeElement as HTMLElement | null)?.blur();
    await TestBed.inject(Router).navigateByUrl('/graph');
    await fixture.whenStable();
    await settle();
    expect(document.activeElement).toBe(document.body);
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

describe('AppNavBarComponent Edit Runs dialog', () => {
  const run = { id: 7, locationName: 'Boston', driverName: 'Ada', time: new Date(0), notes: 'wet' };
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(url.endsWith('/runs') ? [run] : {}), { status: 200 }))
    );
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('updates the selected run once the form is submitted and the dialog has closed', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openRunForm();
    await fixture.whenStable();
    await settle();

    const submit = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Submit'
    )!;
    expect(submit).toBeDefined();
    submit.click();
    await fixture.whenStable();
    await settle();

    expect(document.querySelector('run-form')).toBeNull();
    const update = fetchMock.mock.calls.find(([url]) => String(url).includes('/runs/update/'));
    expect(update).toBeDefined();
    expect(update![0]).toMatch(/\/runs\/update\/7\/Ada\/Boston\/wet$/);
    expect(update![1]).toEqual({ method: 'POST' });
  });
});
