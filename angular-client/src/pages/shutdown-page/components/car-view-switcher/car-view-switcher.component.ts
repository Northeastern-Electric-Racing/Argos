import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { segmentedClasses } from 'src/ui/recipes/segmented';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarView3dComponent } from '../car-view-3d/car-view-3d.component';
import { CarViewComponent } from '../car-view/car-view.component';

export type CarViewMode = '2d' | '3d';
export const CAR_VIEW_STORAGE_KEY = 'argos.shutdown.carView';

/** The stored view, or 3D when none is stored or storage is unavailable (private mode, blocked). */
export function readCarViewMode(
  storage: Pick<globalThis.Storage, 'getItem'> | undefined = globalThis.localStorage
): CarViewMode {
  try {
    return storage?.getItem(CAR_VIEW_STORAGE_KEY) === '2d' ? '2d' : '3d';
  } catch {
    return '3d';
  }
}

function writeCarViewMode(mode: CarViewMode): void {
  try {
    globalThis.localStorage?.setItem(CAR_VIEW_STORAGE_KEY, mode);
  } catch {
    // Not remembered this time; the toggle still works.
  }
}

/** The car view with a 2D / 3D toggle; the choice is remembered in this browser. */
@Component({
  selector: 'car-view-switcher',
  templateUrl: './car-view-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarViewComponent, CarView3dComponent]
})
export class CarViewSwitcherComponent {
  nodes = input.required<NodeStatus[]>();

  readonly mode = signal<CarViewMode>(readCarViewMode());
  readonly modes: readonly { id: CarViewMode; label: string }[] = [
    { id: '3d', label: '3D' },
    { id: '2d', label: '2D' }
  ];
  readonly segmented = segmentedClasses;

  setMode(mode: CarViewMode): void {
    this.mode.set(mode);
    writeCarViewMode(mode);
  }
}
