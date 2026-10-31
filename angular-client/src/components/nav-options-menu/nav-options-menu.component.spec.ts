import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';
import { NavOptionsMenuComponent } from './nav-options-menu.component';

describe('NavOptionsMenuComponent', () => {
  let fixture: ComponentFixture<NavOptionsMenuComponent>;
  const editRuns: NavItem = { label: 'Edit Runs', icon: 'edit', action: () => {} };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavOptionsMenuComponent, MatIconTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NavOptionsMenuComponent);
    fixture.componentRef.setInput('items', [{ label: 'Map', icon: 'map', route: '/map' }, editRuns]);
    fixture.detectChanges();
  });

  it('renders pages as menu-item links and actions as menu-item buttons', () => {
    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="menuitem"]')].map((item) => [
      item.tagName.toLowerCase(),
      item.textContent?.trim(),
      item.getAttribute('href')
    ]);
    expect(items).toEqual([
      ['a', 'Map', '/map'],
      ['button', 'Edit Runs', null]
    ]);
  });

  it('reports the clicked action', () => {
    const clicked: NavItem[] = [];
    fixture.componentInstance.itemClick.subscribe((item) => clicked.push(item));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[role="menuitem"]')!.click();

    expect(clicked).toEqual([editRuns]);
  });
});
