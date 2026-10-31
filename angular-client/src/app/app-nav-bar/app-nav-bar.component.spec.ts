import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppNavBarComponent } from './app-nav-bar.component';

@Component({ template: '' })
class BlankPageComponent {}

describe('AppNavBarComponent', () => {
  const navbarAt = async (url: string) => {
    const harness = await RouterTestingHarness.create(url);
    const fixture = TestBed.createComponent(AppNavBarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return { harness, fixture, el: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => {
    // Desktop layout (the drawer is the mobile one)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1400 });
    TestBed.configureTestingModule({
      // The fake registry serves blank SVGs for the nav's mat-icons
      imports: [AppNavBarComponent, MatIconTestingModule],
      providers: [provideRouter([{ path: '**', component: BlankPageComponent }])]
    });
  });

  it('renders the top-level pages as links with hrefs', async () => {
    const { el } = await navbarAt('/landing');

    const links = [...el.querySelectorAll<HTMLAnchorElement>('nav.navbar a')].map((a) => [
      a.getAttribute('aria-label') || a.textContent?.trim(),
      a.getAttribute('href')
    ]);
    expect(links).toEqual([
      ['Home', '/landing'],
      ['Charging', '/charging'],
      ['Graph', '/graph'],
      ['BMS', '/bms'],
      ['eFuses', '/efuses']
    ]);
  });

  it('marks only the current page with aria-current, including its sub-pages', async () => {
    const { harness, fixture, el } = await navbarAt('/graph');
    const current = () => [...el.querySelectorAll('nav.navbar a[aria-current="page"]')].map((a) => a.textContent?.trim());
    expect(current()).toEqual(['Graph']);

    await harness.navigateByUrl('/bms/segment/1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(current()).toEqual(['BMS']);
  });

  it('moves focus to the More pages button before running a menu action, so the dialog returns focus there', async () => {
    const { fixture, el } = await navbarAt('/landing');
    let focusedWhenRun: Element | null = null;

    fixture.componentInstance.onMenuItemClick({
      label: 'Edit Runs',
      icon: 'edit',
      action: () => (focusedWhenRun = document.activeElement)
    });

    expect(focusedWhenRun).toBe(el.querySelector('button[aria-label="More pages"]'));
  });
});
