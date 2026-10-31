import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from '../typography/typography.component';

/**
 * A nav item's icon and label, styled onto a native element: an `a` with routerLink for a page, or a
 * `button` for an action. The host element gives the role, focus and keyboard handling; the active
 * style follows routerLinkActive's `active` class.
 */
@Component({
  selector: 'a[sidebarChip], button[sidebarChip]',
  templateUrl: './sidebar-chip.component.html',
  styleUrls: ['./sidebar-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatIcon, TypographyComponent]
})
export default class SidebarChipComponent {
  icon = input<string>('');
  value = input<string>('');
  small = input<boolean>(false);
}
