import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Subject } from 'rxjs';
import { AppNavBarComponent } from './app-nav-bar.component';

describe('AppNavBarComponent', () => {
  let fixture: ComponentFixture<AppNavBarComponent>;
  let component: AppNavBarComponent;
  let closed$: Subject<unknown>;
  const open = vi.fn();
  const realWidth = window.innerWidth;

  const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

  beforeEach(async () => {
    closed$ = new Subject();
    open.mockReset().mockImplementation(() => ({ closed$ }));
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: HlmDialogService, useValue: { open } }]
    }).compileComponents();
    fixture = TestBed.createComponent(AppNavBarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => setWidth(realWidth));

  const navItem = (label: string) => component.allNavItems.find((item) => item.label === label)!;

  it('closes the mobile nav sheet when a page is picked', () => {
    component.sidebarVisible = true;
    navItem('Graph').onClick();
    expect(component.sidebarVisible).toBe(false);
  });

  it('closes the mobile nav sheet when Edit Runs opens its dialog', () => {
    component.sidebarVisible = true;
    navItem('Edit Runs').onClick();
    expect(open).toHaveBeenCalledTimes(1);
    expect(component.sidebarVisible).toBe(false);
  });

  it('returns focus to the menu button when the Edit Run dialog from the sheet closes', async () => {
    setWidth(390);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();

    navItem('Edit Runs').onClick();
    (document.activeElement as HTMLElement | null)?.blur();
    closed$.next(undefined);

    const menuButton = (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Open navigation"]');
    expect(document.activeElement).toBe(menuButton);
    fixture.nativeElement.remove();
  });
});
