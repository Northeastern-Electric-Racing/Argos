import { Component, input, output } from '@angular/core';

/**
 * Single-button lock control that mirrors the 3D styling of the eFuse switch.
 * The base stays fixed; the button face moves on hover/pressed.
 */
@Component({
  selector: 'lock-button',
  templateUrl: './lock-button.component.html',
  styleUrls: ['./lock-button.component.css'],
  standalone: true
})
export class LockButtonComponent {
  /** Whether the lock is currently engaged */
  locked = input<boolean>(true);

  /** Emitted when the user clicks the lock button */
  pressed = output<void>();
}
