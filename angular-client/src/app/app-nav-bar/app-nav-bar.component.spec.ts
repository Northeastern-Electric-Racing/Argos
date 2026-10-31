import type { Mock } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { of } from 'rxjs';
import { ToastService } from 'src/services/toast.service';
import { AppNavBarComponent } from './app-nav-bar.component';

@Component({ template: '' })
class BlankPageComponent {}

describe('AppNavBarComponent', () => {
  let fixture: ComponentFixture<AppNavBarComponent>;
  let toastSpy: { add: Mock };
  let fetchMock: Mock;

  const flush = () => new Promise((resolve) => setTimeout(resolve));
  const el = (): HTMLElement => fixture.nativeElement;

  /** Renders the nav bar at a window width, on the given route. */
  const render = async (width: number, url = '/landing') => {
    vi.stubGlobal('innerWidth', width);
    fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    toastSpy = { add: vi.fn().mockName('ToastService.add') };
    // app-context registers the nav's SVG icons; stand in a blank one for each.
    vi.spyOn(MatIconRegistry.prototype, 'getNamedSvgIcon').mockImplementation(() =>
      of(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    );

    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [
        provideRouter([{ path: '**', component: BlankPageComponent }]),
        { provide: ToastService, useValue: toastSpy }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const pageLinks = () =>
    Array.from(el().querySelectorAll('mat-nav-list.navbar-nav a[mat-list-item]') as NodeListOf<HTMLAnchorElement>);
  const labelOf = (link: Element) => link.getAttribute('aria-label') ?? link.textContent?.trim();
  const startNewRunButton = (): HTMLButtonElement =>
    Array.from(el().querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === 'Start New Run'
    )!;
  const openAppsMenu = (): string[] => {
    (el().querySelector('button.navbar-menu') as HTMLButtonElement).click();
    fixture.detectChanges();
    return Array.from(document.querySelectorAll('.menu-item .menu-label')).map((label) => label.textContent!.trim());
  };

  describe('desktop page links', () => {
    it('are links in a navigation landmark, not tabs', async () => {
      await render(1440);
      const nav = el().querySelector('mat-nav-list.navbar-nav')!;
      expect(nav.getAttribute('role')).toBe('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Pages');
      expect(pageLinks().map((link) => link.getAttribute('href'))).toEqual(['/charging', '/graph', '/bms', '/efuses']);
      expect(pageLinks().every((link) => link.getAttribute('role') === null)).toBe(true);
    });

    it('mark the current page, including its subroutes and query strings', async () => {
      await render(1440, '/graph?x=1');
      const current = () => pageLinks().filter((link) => link.getAttribute('aria-current') === 'page');
      expect(current().map(labelOf)).toEqual(['Graph']);

      await TestBed.inject(Router).navigateByUrl('/bms/segment/1');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(current().map(labelOf)).toEqual(['BMS']);
      expect(current()[0].classList).toContain('mdc-list-item--activated');
    });

    it('mark no page link on a page outside them', async () => {
      await render(1440, '/faults');
      expect(pageLinks().some((link) => link.hasAttribute('aria-current'))).toBe(false);
    });

    it('show full-size labels above 1400px and compact ones at 1400px and below', async () => {
      await render(1440);
      expect(el().querySelector('mat-nav-list.navbar-nav')!.classList).not.toContain('navbar-nav--compact');
      fixture.destroy();

      await render(1400);
      expect(el().querySelector('mat-nav-list.navbar-nav')!.classList).toContain('navbar-nav--compact');
      expect(pageLinks().map((link) => link.querySelector('[matListItemTitle]')?.textContent)).toEqual([
        'Charging',
        'Graph',
        'BMS',
        'eFuses'
      ]);
    });

    it('go icon-only at 1160px, named by aria-label with a tooltip', async () => {
      await render(1160);
      expect(pageLinks().map((link) => link.getAttribute('aria-label'))).toEqual(['Charging', 'Graph', 'BMS', 'eFuses']);
      expect(pageLinks().some((link) => link.querySelector('[matListItemTitle]'))).toBe(false);
      expect(pageLinks().every((link) => link.classList.contains('mat-mdc-tooltip-trigger'))).toBe(true);
    });

    it('leave the apps menu to the secondary pages while they fit', async () => {
      await render(1160);
      expect(openAppsMenu().slice(0, 1)).toEqual(['Fault']);
    });

    it('move into the apps menu at 1000px and below, so every page stays reachable', async () => {
      await render(1000);
      expect(el().querySelector('mat-nav-list.navbar-nav')).toBeNull();
      expect(openAppsMenu().slice(0, 5)).toEqual(['Charging', 'Graph', 'BMS', 'eFuses', 'Fault']);
    });
  });

  describe('mobile drawer', () => {
    it('replaces the toolbar at 768px with page links that mark the current page', async () => {
      await render(768, '/bms/segment/2');
      expect(el().querySelector('mat-toolbar')).toBeNull();
      const links = Array.from(el().querySelectorAll('mat-nav-list a[mat-list-item]'));
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/landing',
        '/charging',
        '/graph',
        '/bms',
        '/efuses',
        '/faults',
        '/map',
        '/camera',
        '/commands',
        '/rules',
        '/lap-timer'
      ]);
      expect(links.filter((link) => link.getAttribute('aria-current') === 'page').map((l) => l.textContent?.trim())).toEqual(
        ['BMS']
      );
      expect(el().querySelector('mat-nav-list button[mat-list-item]')?.textContent?.trim()).toBe('Edit Runs');
    });
  });

  describe('Start New Run', () => {
    beforeEach(() => render(1440));

    it('toasts success only once the server has started the run', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 200 }));

      startNewRunButton().click();
      expect(toastSpy.add).not.toHaveBeenCalled();
      await flush();

      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ severity: 'success', summary: 'New Run Started' })
      );
    });

    it('is disabled while a run is starting, so a double click starts one run', async () => {
      startNewRunButton().click();
      fixture.detectChanges();
      expect(startNewRunButton().disabled).toBe(true);

      startNewRunButton().click();
      expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/runs/new'))).toHaveLength(1);
    });

    it('toasts the server error once, with no success, and can be retried', async () => {
      fetchMock.mockResolvedValue(new Response('Could not connect to db', { status: 500, statusText: 'Server Error' }));

      startNewRunButton().click();
      await flush();
      fixture.detectChanges();

      expect(toastSpy.add.mock.calls.map(([message]) => [message.severity, message.detail])).toEqual([
        ['error', 'Server Error']
      ]);
      expect(startNewRunButton().disabled).toBe(false);
    });
  });
});
