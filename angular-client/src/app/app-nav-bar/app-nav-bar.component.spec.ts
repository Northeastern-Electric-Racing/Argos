import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideRouter } from '@angular/router';
import SidebarService from 'src/services/sidebar.service';
import { AppNavBarComponent } from './app-nav-bar.component';

describe('AppNavBarComponent — mobile nav drawer', () => {
  let fixture: ComponentFixture<AppNavBarComponent>;
  const { innerWidth } = window;

  const drawerLinks = () => document.querySelectorAll('.ant-drawer sidebar-chip');
  /** Waits out nz-drawer's 300ms open or close animation, then re-renders. */
  const afterAnimation = async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent, MatIconTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: innerWidth });
  });

  it('renders no nav links while the drawer is closed', async () => {
    await afterAnimation();
    expect(drawerLinks()).toHaveLength(0);
  });

  it('shows the nav links when the sidebar opens and removes them once it closes', async () => {
    TestBed.inject(SidebarService).openSidebar();
    await afterAnimation();
    expect(drawerLinks().length).toBe(fixture.componentInstance.allNavItems.length);

    (document.querySelector('.ant-drawer-close') as HTMLButtonElement).click();
    await afterAnimation();
    expect(drawerLinks()).toHaveLength(0);
    expect(fixture.componentInstance.sidebarVisible()).toBe(false);
  });
});
