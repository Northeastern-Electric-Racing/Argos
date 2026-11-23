import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { segmentedClasses } from 'src/ui/recipes/segmented';

export type CarViewMode = '2d' | '3d';
export const CAR_VIEW_STORAGE_KEY = 'argos.shutdown.carView';
/** With no stored choice, 3D only on a wide screen with a fine pointer (a laptop or desktop); 2D on phones and tablets. */
export const CAR_VIEW_3D_QUERY = '(min-width: 1024px) and (pointer: fine)';

type MatchMedia = (query: string) => Pick<MediaQueryList, 'matches'>;

/** The default when nothing is stored: CAR_VIEW_3D_QUERY decides. */
export function defaultCarViewMode(
  matchMedia: MatchMedia | undefined = globalThis.matchMedia?.bind(globalThis)
): CarViewMode {
  try {
    return matchMedia?.(CAR_VIEW_3D_QUERY).matches ? '3d' : '2d';
  } catch {
    return '2d';
  }
}

/** The stored view; with none stored (or storage blocked), the default for this screen. A stored choice always wins. */
export function readCarViewMode(
  storage: Pick<globalThis.Storage, 'getItem'> | undefined = globalThis.localStorage,
  matchMedia?: MatchMedia
): CarViewMode {
  let stored: string | null | undefined;
  try {
    stored = storage?.getItem(CAR_VIEW_STORAGE_KEY);
  } catch {
    stored = undefined;
  }
  if (stored === '2d' || stored === '3d') return stored;
  return matchMedia ? defaultCarViewMode(matchMedia) : defaultCarViewMode();
}

export function writeCarViewMode(
  mode: CarViewMode,
  storage: Pick<globalThis.Storage, 'setItem'> | undefined = globalThis.localStorage
): void {
  try {
    storage?.setItem(CAR_VIEW_STORAGE_KEY, mode);
  } catch {
    // Not remembered this time; the toggle still works.
  }
}

/**
 * The 2D / 3D toggle in the car section's header. The page owns the mode (`[(mode)]`) and renders the view; a
 * choice made here is remembered in this browser. `notice` says why 3D is showing as 2D (it fell back); choosing
 * 3D again retries it.
 */
@Component({
  selector: 'car-view-mode',
  templateUrl: './car-view-mode.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center justify-end gap-x-3 gap-y-1' },
  imports: [UiIconComponent]
})
export class CarViewModeComponent {
  readonly mode = model.required<CarViewMode>();
  /** Why the 3D view is unavailable right now, or null. */
  readonly notice = input<string | null>(null);

  protected readonly modes: readonly { id: CarViewMode; label: string }[] = [
    { id: '3d', label: '3D' },
    { id: '2d', label: '2D' }
  ];
  protected readonly segmented = segmentedClasses;

  protected choose(mode: CarViewMode): void {
    this.mode.set(mode);
    writeCarViewMode(mode);
  }
}
