import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { AppNavBarComponent } from './app-nav-bar.component';

describe('AppNavBarComponent', () => {
  let component: AppNavBarComponent;
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    await TestBed.configureTestingModule({
      imports: [AppNavBarComponent],
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: HlmDialogService, useValue: { open } }]
    }).compileComponents();
    component = TestBed.createComponent(AppNavBarComponent).componentInstance;
  });

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
});
