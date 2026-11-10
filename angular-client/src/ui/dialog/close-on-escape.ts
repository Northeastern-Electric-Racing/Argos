import { hasModifierKey } from '@angular/cdk/keycodes';
import { Observable } from 'rxjs';

/**
 * Closes a dialog, panel or drawer on a bare Escape (no modifier key), as the CDK's own handling does; used where
 * that handling is off (`disableClose`) or absent (a plain overlay). `keydownEvents` must complete when the surface
 * closes, as a DialogRef's and an OverlayRef's do.
 */
export function closeOnEscape(keydownEvents: Observable<KeyboardEvent>, close: () => void): void {
  keydownEvents.subscribe((event) => {
    if (event.key === 'Escape' && !hasModifierKey(event)) {
      event.preventDefault();
      close();
    }
  });
}
