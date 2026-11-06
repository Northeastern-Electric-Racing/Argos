import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { injectFocusAfterRender } from './focus-after-render';

@Component({
  template: `@if (editing()) {
      <input aria-label="Name" value="Practice" />
    } @else {
      <button type="button" (click)="edit()">Rename</button>
    }`
})
class HostComponent {
  editing = signal(false);
  focusAfterRender = injectFocusAfterRender();
  focusedFirst = false;
  edit() {
    this.editing.set(true);
    this.focusAfterRender(
      () => document.querySelector('input'),
      (input) => {
        this.focusedFirst = document.activeElement === input;
        (input as HTMLInputElement).select();
      }
    );
  }
}

describe('injectFocusAfterRender', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('focuses the element once it has rendered, then runs `then` on it with focus already there', async () => {
    const fixture = await setup();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(fixture.componentInstance.focusedFirst).toBe(true);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'Practice'.length]);
  });

  it('shows no ring after a mouse press and a ring after a key press', async () => {
    for (const [event, ring] of [
      [new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }), false],
      [new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }), true]
    ] as const) {
      const fixture = await setup();
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      document.dispatchEvent(event);
      fixture.componentInstance.edit();
      await fixture.whenStable();
      expect(focus).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: ring }));
      vi.restoreAllMocks();
      fixture.destroy();
    }
  });

  it('does nothing when there is nothing to focus', async () => {
    const fixture = await setup();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.focus();
    fixture.componentInstance.focusAfterRender(
      () => null,
      () => {
        throw new Error('then must not run');
      }
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(button);
  });
});
