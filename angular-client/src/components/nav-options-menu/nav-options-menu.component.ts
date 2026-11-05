import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';
import { appsMenuClasses } from 'src/ui/recipes/menu';

/**
 * The navbar's "more pages" menu: an Angular Aria MenuTrigger + Menu in a CDK connected overlay,
 * so it gets role=menu/menuitem, arrow keys, typeahead, Escape and focus return.
 * Its 48px icons are `inline` mat-icons in a sized box: iconClasses (src/ui/recipes/icon.ts) stops at 36px.
 */
@Component({
  selector: 'app-nav-options-menu',
  imports: [Menu, MenuContent, MenuItem, MenuTrigger, OverlayModule, MatIconModule],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' }
})
export class NavOptionsMenuComponent {
  items = input<NavItem[]>([]);
  protected readonly classes = appsMenuClasses;
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
