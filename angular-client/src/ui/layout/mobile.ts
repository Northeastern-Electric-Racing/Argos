import { BreakpointObserver } from '@angular/cdk/layout';
import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Below Tailwind's md breakpoint (768px), the same cutoff as its `max-md` styles. */
export const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * Whether the viewport is mobile width, matching `max-md`, so a component's TypeScript and its styles agree on
 * mobile at every width. Follows the viewport as it is resized. Call it in an injection context.
 */
export const injectIsMobile = (): Signal<boolean> =>
  toSignal(
    inject(BreakpointObserver)
      .observe(MOBILE_QUERY)
      .pipe(map((state) => state.matches)),
    { requireSync: true }
  );
