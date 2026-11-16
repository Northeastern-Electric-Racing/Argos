import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { NavItem } from 'src/app/app-nav-bar/app-nav-bar.component';
import { appsMenuClasses } from 'src/ui/recipes/menu';

/**
 * The navbar's "more pages" menu: an Angular Aria MenuTrigger + Menu in a CDK connected overlay,
 * so it gets role=menu/menuitem, arrow keys, typeahead, Escape and focus return.
 * Its 48px icons are `inline` ui-icons in a sized box: the icon sizes (src/ui/recipes/icon.ts) stop at 36px.
 *
 * Its items stay commands rather than links, as role=menuitem calls for, so an item that navigates asks the
 * router here; the nav bar's own chips are routerLinks.
 */
@Component({
  selector: 'app-nav-options-menu',
  imports: [Menu, MenuContent, MenuItem, MenuTrigger, OverlayModule, UiIconComponent],
  templateUrl: './nav-options-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' }
})
export class NavOptionsMenuComponent {
  private router = inject(Router);
  items = input<NavItem[]>([]);
  protected readonly classes = appsMenuClasses;
  protected menu = viewChild<Menu<string>>('appsMenu');
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
  ];

  /** Items are identified by label: every one has a distinct label, and not all of them have a route. */
  protected select(label: string): void {
    const item = this.items().find((candidate) => candidate.label === label);
    if (!item) return;
    if (item.route) void this.router.navigate([item.route]);
    else item.action?.();
  }
}
