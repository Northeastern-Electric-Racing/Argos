import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, output, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

export type SessionAction = 'rename' | 'download' | 'delete';

/** A session row's "more" menu: Angular Aria MenuTrigger + Menu in a CDK connected overlay. */
@Component({
  selector: 'session-menu',
  templateUrl: './session-menu.component.html',
  styleUrls: ['./session-menu.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Menu, MenuContent, MenuItem, MenuTrigger, OverlayModule, MatIcon]
})
export class SessionMenuComponent {
  action = output<SessionAction>();
  protected menu = viewChild<Menu<SessionAction>>('rowMenu');
  protected readonly menuPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 }
  ];
}
