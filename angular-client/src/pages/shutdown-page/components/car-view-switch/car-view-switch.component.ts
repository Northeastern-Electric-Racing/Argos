import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { cx, tw } from 'src/ui/recipes/tw';
import { segmentedClasses } from 'src/ui/recipes/segmented';
import { NodeStatus } from '../../shutdown-loop.utils';
import { CarViewComponent } from '../car-view/car-view.component';
import { CarView3dComponent } from '../car-view-3d/car-view-3d.component';
import { CarViewMode, readViewMode, writeViewMode } from '../car-view-3d/car-view-3d.utils';

const storage = (): Storage => localStorage;

/** The car view with a 2D / 3D toggle; 3D by default, the choice remembered in this browser. */
@Component({
  selector: 'car-view-switch',
  templateUrl: './car-view-switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarViewComponent, CarView3dComponent]
})
export class CarViewSwitchComponent {
  nodes = input.required<NodeStatus[]>();

  readonly mode = signal<CarViewMode>(readViewMode(storage));
  readonly modes: { id: CarViewMode; label: string }[] = [
    { id: '3d', label: '3D' },
    { id: '2d', label: '2D' }
  ];
  readonly listClass = cx(segmentedClasses.list, tw('mb-2 w-28'));
  readonly itemClass = segmentedClasses.item;

  setMode(mode: CarViewMode): void {
    this.mode.set(mode);
    writeViewMode(storage, mode);
  }
}
