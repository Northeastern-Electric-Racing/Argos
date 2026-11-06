import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { appRoutes } from '../app-routes';
import { AppNavBarComponent } from './app-nav-bar.component';

describe('AppNavBarComponent', () => {
  let component: AppNavBarComponent;
  let fixture: ComponentFixture<AppNavBarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [provideRouter([])]
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
  it('sends the home logo to the graph page', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.homeNavItem.onClick();

    expect(navigate).toHaveBeenCalledWith([appRoutes.graphRoute()]);
  });

  it('lists the graph page once in the sidebar', () => {
    const graphItems = component.allNavItems.filter((navItem) => navItem.id === appRoutes.graphRoute());

    expect(graphItems).toHaveLength(1);
    expect(graphItems[0].label).toBe('Graph');
  });

  it('still shows the current run', () => {
    expect(fixture.nativeElement.querySelector('current-run-display')).toBeTruthy();
  });
});
