import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import { appRoutes } from '../app-routes';
import { AppNavBarComponent } from './app-nav-bar.component';

@Component({ standalone: true, template: '' })
class StubPageComponent {}

describe('AppNavBarComponent', () => {
  let component: AppNavBarComponent;
  let fixture: ComponentFixture<AppNavBarComponent>;
  let router: Router;

  // The chips highlight themselves through routerLinkActive, so the active ones are read off the
  // rendered chips rather than from any component state.
  const activeChipLabels = (): string[] =>
    fixture.debugElement
      .queryAll(By.directive(SidebarChipComponent))
      .filter((chip) => chip.componentInstance.active())
      .map((chip) => chip.componentInstance.value());

  const navigateTo = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [
        provideRouter([
          { path: '', redirectTo: appRoutes.graphRoute(), pathMatch: 'full' },
          { path: 'graph', component: StubPageComponent },
          { path: 'bms', component: StubPageComponent },
          { path: 'bms/segment/:id', component: StubPageComponent },
          { path: 'charging', component: StubPageComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppNavBarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // The landing page was removed in #847: the home logo now opens the graph page.
  it('sends the home logo to the graph page', async () => {
    fixture.debugElement.query(By.css('.home-logo')).nativeElement.click();
    await fixture.whenStable();

    expect(router.url).toBe(appRoutes.graphRoute());
  });

  it('lists the graph page once in the sidebar', () => {
    const graphItems = component.allNavItems.filter((navItem) => navItem.route === appRoutes.graphRoute());

    expect(graphItems).toHaveLength(1);
    expect(graphItems[0].label).toBe('Graph');
  });

  it('still shows the current run', () => {
    expect(fixture.nativeElement.querySelector('current-run-display')).toBeTruthy();
  });

  // Argos opens on '/', which redirects to the graph page; the chip has to follow the redirect.
  it('highlights the graph chip when the root redirects to it', async () => {
    await navigateTo('/');

    expect(activeChipLabels()).toEqual(['Graph']);
  });

  it('keeps the graph chip highlighted once topics are in the query string', async () => {
    await navigateTo(`${appRoutes.graphRoute()}?topics=pack_temp`);

    expect(activeChipLabels()).toEqual(['Graph']);
  });

  it('highlights only the chip for the page being viewed', async () => {
    await navigateTo(appRoutes.chargingRoute());

    expect(activeChipLabels()).toEqual(['Charging']);
  });

  // Prefix matching keeps the parent chip lit on nested pages.
  it('keeps the bms chip highlighted on a segment page', async () => {
    await navigateTo(appRoutes.bmsSegmentViewRoute(0));

    expect(activeChipLabels()).toEqual(['BMS']);
  });
});
