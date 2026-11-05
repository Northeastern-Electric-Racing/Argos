import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import SidebarService from 'src/services/sidebar.service';
import { AppNavBarComponent } from './app-nav-bar.component';

@Component({ template: '' })
class Blank {}

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
          { path: 'graph', component: Blank }
        ])
      ]
    });
    const fixture = TestBed.createComponent(AppNavBarComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const drawer = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Navigation"]');
    const open = async () => {
      TestBed.inject(SidebarService).openSidebar();
      await fixture.whenStable();
      await settle();
    };
    return { fixture, drawer, open };
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
});
