import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, input, model, signal, WritableSignal } from '@angular/core';
import { segmentedClasses } from 'src/ui/recipes/segmented';
import { cx, tw } from 'src/ui/recipes/tw';

export type CarViewMode = '2d' | '3d';

/** Where the 2D/3D choice is remembered, per browser. */
export const CAR_VIEW_MODE_KEY = 'argos.shutdown.carView';
/** With nothing stored, 3D is the default only on a wide screen with a fine pointer (a laptop, not a phone). */
export const WIDE_FINE_POINTER = '(min-width: 1024px) and (pointer: fine)';

/** The stored choice; otherwise 3D when `matches(WIDE_FINE_POINTER)`, else 2D. Blocked storage counts as empty. */
export function readCarViewMode(storage: () => Pick<Storage, 'getItem'>, matches: (query: string) => boolean): CarViewMode {
  let stored: string | null = null;
  try {
    stored = storage().getItem(CAR_VIEW_MODE_KEY);
  } catch {
    // Private mode or blocked storage: fall through to the default.
  }
  if (stored === '2d' || stored === '3d') return stored;
  try {
    return matches(WIDE_FINE_POINTER) ? '3d' : '2d';
  } catch {
    return '2d';
  }
}

export function writeCarViewMode(storage: () => Pick<Storage, 'setItem'>, mode: CarViewMode): void {
  try {
    storage().setItem(CAR_VIEW_MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

const browserStorage = (): Storage => localStorage;

/** The page's 2D/3D mode, starting from the stored choice or the default. Call in an injection context. */
export function injectCarViewMode(): WritableSignal<CarViewMode> {
  const breakpoints = inject(BreakpointObserver);
  return signal(readCarViewMode(browserStorage, (query) => breakpoints.isMatched(query)));
}

/**
 * The 2D / 3D toggle for the car section. The page owns the mode (`[(mode)]`) and renders the matching view; a
 * choice made here is remembered in this browser. A fallback to 2D (the 3D view's `unavailable`) is not a choice,
 * so it is not stored: the next visit tries 3D again.
 */
@Component({
  selector: 'car-view-mode',
  templateUrl: './car-view-mode.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarViewModeComponent {
  readonly mode = model<CarViewMode>('3d');
  /** Why 3D is not showing (the fallback notice), or empty; describes the 3D button. */
  readonly unavailable = input('');

  readonly modes: { id: CarViewMode; label: string }[] = [
    { id: '2d', label: '2D' },
    { id: '3d', label: '3D' }
  ];
  readonly listClass = cx(segmentedClasses.list, tw('w-28'));
  readonly itemClass = segmentedClasses.item;

  choose(mode: CarViewMode): void {
    this.mode.set(mode);
    writeCarViewMode(browserStorage, mode);
  }
}
