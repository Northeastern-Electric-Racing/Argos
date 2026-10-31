import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideRouter } from '@angular/router';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
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
      providers: [provideRouter([{ path: '**', children: [] }])]
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

  it('closes once a page is picked from it', async () => {
    TestBed.inject(SidebarService).openSidebar();
    await afterAnimation();
    (drawerLinks()[2] as HTMLElement).click();
    await afterAnimation();
    expect(drawerLinks()).toHaveLength(0);
  });
});

describe('AppNavBarComponent — Start New Run', () => {
  let fixture: ComponentFixture<AppNavBarComponent>;
  let respond!: (response: Response) => void;
  const notify = { create: vi.fn() };

  beforeEach(async () => {
    notify.create.mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        /runs\/new/.test(url) ? new Promise<Response>((resolve) => (respond = resolve)) : new Promise<Response>(() => {})
      )
    );
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent, MatIconTestingModule],
      providers: [provideRouter([]), { provide: NotificationAnnouncerService, useValue: notify }]
    }).compileComponents();
    fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.componentInstance.isMobile = false;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('shows the success toast only once the server has started the run', async () => {
    fixture.componentInstance.onStartNewRun();
    expect(fixture.componentInstance.newRunIsLoading()).toBe(true);
    expect(notify.create).not.toHaveBeenCalled();

    respond(new Response(JSON.stringify({ id: 7 }), { status: 200 }));
    await vi.waitFor(() => expect(notify.create).toHaveBeenCalledWith('success', 'New Run Started', expect.any(String)));
    expect(fixture.componentInstance.newRunIsLoading()).toBe(false);
  });

  it('shows one error toast and stops spinning when the server refuses', async () => {
    fixture.componentInstance.onStartNewRun();
    respond(new Response('nope', { status: 500, statusText: 'Internal Server Error' }));
    await vi.waitFor(() => expect(notify.create).toHaveBeenCalledWith('error', 'Error', 'Internal Server Error'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(notify.create).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.newRunIsLoading()).toBe(false);
  });
});
