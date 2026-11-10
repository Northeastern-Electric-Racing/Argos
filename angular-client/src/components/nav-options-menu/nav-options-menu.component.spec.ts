import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';
import { NavOptionsMenuComponent } from './nav-options-menu.component';

@Component({ standalone: true, template: '' })
class StubPageComponent {}

describe('NavOptionsMenuComponent', () => {
  let component: NavOptionsMenuComponent;
  let fixture: ComponentFixture<NavOptionsMenuComponent>;

  const mount = async (items: NavItem[]): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [NavOptionsMenuComponent],
      providers: [
        provideRouter([{ path: 'map', component: StubPageComponent }]),
        { provide: DynamicDialogConfig, useValue: { data: { items } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavOptionsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const clickItem = (label: string): void => {
    const item = fixture.debugElement
      .queryAll(By.css('.menu-item'))
      .find((el) => el.nativeElement.textContent.trim() === label);

    item!.nativeElement.click();
  };

  it('should create', async () => {
    await mount([]);

    expect(component).toBeTruthy();
  });

  // The menu renders the same NavItems as the nav bar, so pages navigate through routerLink.
  it('navigates to an item with a route', async () => {
    await mount([{ label: 'Map', route: '/map', icon: 'map' }]);

    clickItem('Map');
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/map');
  });

  // Edit Runs opens a dialog instead of navigating.
  it('runs the action of an item with no route', async () => {
    const action = vi.fn();
    await mount([{ label: 'Edit Runs', action, icon: 'edit' }]);

    clickItem('Edit Runs');

    expect(action).toHaveBeenCalled();
  });
});
