import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import StatusBarComponent from './status-bar.component';

// A host exercises projection and the title input exactly as a consumer would.
// title is a signal so updates integrate with zoneless change detection.
// Zoneless change detection is registered globally in src/test-providers.ts.
@Component({
  template: `<status-bar [title]="title()"><span id="projected">chip</span></status-bar>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [StatusBarComponent]
})
class HostComponent {
  title = signal('Quick view');
}

describe('StatusBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HTMLElement;

  const q = (selector: string): HTMLElement | null => host.querySelector(selector);
  // Classes are styling, not structure: find the controls by their names.
  const hide = () => q('button[aria-label="Hide status bar"]');
  const show = () => q('button[aria-label="Show status bar"]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });
  // The focus spies sit on HTMLElement.prototype, which every spec file in the worker shares (isolate: false).
  afterEach(() => vi.restoreAllMocks());

  it('auto-opens with the panel and projected chips, and no edge handle', () => {
    expect(hide()?.getAttribute('aria-expanded')).toBe('true');
    expect(show()).toBeFalsy();
    expect(q('#projected')?.textContent).toContain('chip');
  });

  it('renders the title input in the header', () => {
    expect(host.textContent).toContain('Quick view');

    fixture.componentInstance.title.set('Pinned');
    fixture.detectChanges();

    expect(host.textContent).toContain('Pinned');
    expect(host.textContent).not.toContain('Quick view');
  });

  it('collapses to a handle and re-expands on toggle', () => {
    (hide() as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('#projected')).toBeFalsy();
    expect(hide()).toBeFalsy();
    expect(show()?.getAttribute('aria-expanded')).toBe('false');

    (show() as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('#projected')).toBeTruthy();
    expect(show()).toBeFalsy();
  });

  // Regression: a scrolling focus() on the freshly-swapped control drags the whole page
  // sideways for the length of `sidebar-in`. Moving focus must never move the page.
  it('focuses the successor without scrolling the page into the animation overflow', async () => {
    // The successor element does not exist until after the toggle renders it, so spy on the
    // prototype and assert against the call that actually landed.
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');

    (hide() as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(focusSpy.mock.contexts.at(-1)).toBe(show()!);
    expect(focusSpy.mock.lastCall).toEqual([expect.objectContaining({ preventScroll: true })]);

    (show() as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(focusSpy.mock.contexts.at(-1)).toBe(hide()!);
    expect(focusSpy.mock.lastCall).toEqual([expect.objectContaining({ preventScroll: true })]);
  });

  it('moves keyboard focus to the successor control on toggle', async () => {
    (hide() as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(show());

    (show() as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(hide());
  });

  // A mouse press shows no ring on the moved focus, a key press does (CDK InputModalityDetector).
  it('shows a ring on the successor only after a key press', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    for (const [event, ring] of [
      [new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }), false],
      [new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }), true]
    ] as const) {
      document.dispatchEvent(event);
      ((hide() ?? show()) as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(focusSpy).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: ring }));
    }
  });
});
