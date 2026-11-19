import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LockButtonComponent } from './lock-button.component';

@Component({
  template: `<lock-button ariaLabel="Lock Shutdown" [locked]="locked()" (pressed)="presses = presses + 1" />`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [LockButtonComponent]
})
class HostComponent {
  locked = signal(true);
  presses = 0;
}

describe('LockButtonComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
    return { fixture, button };
  };

  // A toggle says its state with aria-pressed under one name, not with a name that changes.
  it('is a named toggle, pressed while locked', async () => {
    const { fixture, button } = await setup();
    expect(button().getAttribute('aria-label')).toBe('Lock Shutdown');
    expect(button().type).toBe('button');
    expect(button().getAttribute('aria-pressed')).toBe('true');

    fixture.componentInstance.locked.set(false);
    await fixture.whenStable();
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Lock Shutdown');
  });

  it('reports a press', async () => {
    const { fixture, button } = await setup();
    button().click();
    expect(fixture.componentInstance.presses).toBe(1);
  });

  it('hands its button to a parent that moves focus to it', async () => {
    const { fixture, button } = await setup();
    const lock = fixture.debugElement.children[0].componentInstance as LockButtonComponent;
    expect(lock.button().nativeElement).toBe(button());
  });
});
