import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';

/**
 * The navbar's "more pages" menu: an Angular Aria MenuTrigger + Menu in a CDK connected overlay,
 * so it gets role=menu/menuitem, arrow keys, typeahead, Escape and focus return.
 */
@Component({
  selector: 'app-nav-options-menu',
  imports: [Menu, MenuContent, MenuItem, MenuTrigger, OverlayModule, MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./nav-options-menu.component.css']
})
export class NavOptionsMenuComponent {
  items = input<NavItem[]>([]);
  protected menu = viewChild<Menu<string>>('appsMenu');
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
  ];

  protected select(id: string): void {
    this.items()
      .find((item) => item.id === id)
      ?.onClick();
  }
}
