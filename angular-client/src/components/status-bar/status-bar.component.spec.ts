import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import StatusBarComponent from './status-bar.component';

// A host exercises projection and the title input exactly as a consumer would.
// title is a signal so updates integrate with zoneless change detection.
// Zoneless change detection is registered globally in src/test-setup.ts.
@Component({
  template: `<status-bar [title]="title()"><span class="projected">chip</span></status-bar>`,
  imports: [StatusBarComponent]
})
class HostComponent {
  title = signal('Quick view');
}

describe('StatusBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HTMLElement;

  const q = (selector: string): HTMLElement | null => host.querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('auto-opens with the panel and projected chips, and no edge handle', () => {
    expect(q('.panel')).toBeTruthy();
    expect(q('.side-handle')).toBeFalsy();
    expect(q('.projected')?.textContent).toContain('chip');
  });

  it('renders the title input in the header', () => {
    expect(q('.panel-title')?.textContent?.trim()).toBe('Quick view');

    fixture.componentInstance.title.set('Pinned');
    fixture.detectChanges();

    expect(q('.panel-title')?.textContent?.trim()).toBe('Pinned');
  });

  it('collapses to a handle and re-expands on toggle', () => {
    (q('.panel-collapse') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('.panel')).toBeFalsy();
    expect(q('.side-handle')).toBeTruthy();

    (q('.side-handle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('.panel')).toBeTruthy();
    expect(q('.side-handle')).toBeFalsy();
  });

  // Regression: a scrolling focus() on the freshly-swapped control drags the whole page
  // sideways for the length of `sidebar-in`. Moving focus must never move the page.
  it('focuses the successor without scrolling the page into the animation overflow', async () => {
    // The successor element does not exist until after the toggle renders it, so spy on the
    // prototype and assert against the call that actually landed.
    const focusSpy = spyOn(HTMLElement.prototype, 'focus').and.callThrough();

    (q('.panel-collapse') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(focusSpy.calls.mostRecent().object).toBe(q('.side-handle')!);
    expect(focusSpy.calls.mostRecent().args).toEqual([{ preventScroll: true }]);

    (q('.side-handle') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(focusSpy.calls.mostRecent().object).toBe(q('.panel-collapse')!);
    expect(focusSpy.calls.mostRecent().args).toEqual([{ preventScroll: true }]);
  });

  it('moves keyboard focus to the successor control on toggle', async () => {
    (q('.panel-collapse') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(q('.side-handle'));

    (q('.side-handle') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(q('.panel-collapse'));
  });
});
