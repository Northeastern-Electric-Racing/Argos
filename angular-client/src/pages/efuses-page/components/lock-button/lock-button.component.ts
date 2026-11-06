import { Component, ElementRef, input, output, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { cx, tw } from 'src/ui/recipes/tw';
import { panelButtonClass, panelGroupClass } from '../../efuses.classes';

/**
 * Single-button lock control that mirrors the 3D styling of the eFuse switch: a toggle, pressed (lit red, a
 * closed padlock) while locked. Its name stays the same; aria-pressed says whether it is locked. The open
 * padlock is fg-dim, so the only glyph that names the button reads at 3:1 or more (#909's #3a3a3a was 1.5:1).
 */
@Component({
  selector: 'lock-button',
  templateUrl: './lock-button.component.html',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class LockButtonComponent {
  /** Whether the lock is currently engaged */
  locked = input<boolean>(true);

  /** The button's accessible name, e.g. "Lock Shutdown" */
  ariaLabel = input<string>('Lock');

  /** Emitted when the user clicks the lock button */
  pressed = output<void>();

  /** The button itself, for a parent that moves focus to it after an action locks its controls */
  readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  protected readonly groupClass = panelGroupClass;
  protected readonly buttonClass = cx(
    panelButtonClass,
    tw(
      'bg-surface-1 px-2.75 py-2.5 text-fg-dim not-aria-pressed:hover:bg-surface-2 not-aria-pressed:hover:text-fg-muted aria-pressed:bg-accent/15 aria-pressed:text-accent-fg'
    )
  );
}
