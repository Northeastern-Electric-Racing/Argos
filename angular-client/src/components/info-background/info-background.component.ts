import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import Theme from 'src/services/theme.service';
import { UiIconButtonDirective } from 'src/ui/button/button.directive';
import { SelectorConfig, SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import { cardClass } from 'src/ui/recipes/card';

/**
 * Component that is essentially the template/background for
 * info displayed on the dashboard
 */

interface ButtonInputs {
  onClick: () => void;
  icon: string;
  /** The button's accessible name (it shows only an icon). Default "Reset", what every current caller does. */
  ariaLabel?: string;
}

@Component({
  selector: 'info-background',
  templateUrl: './info-background.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [UiIconComponent, SelectDropdownComponent, TypographyComponent, HStackComponent, UiIconButtonDirective]
})
export class InfoBackgroundComponent {
  icon = input<string>();
  svgIcon = input<string>();
  backgroundColor = input<Theme>(Theme.infoBackground);
  title = input<string>();
  onClick = input<(() => void) | undefined>(undefined);
  button = input<ButtonInputs | undefined>(undefined);
  selectorConfigs = input<SelectorConfig[]>([]);
  topRightInfo = input<string | undefined>(undefined);
  topRightInfoSize = input<string>('19px');

  slicedLeftCorner = input<boolean>(false); // slice out the upper left corner
  slicePercentage = input<number>(125); // pixel size of the corner slice (used for both clip-path x and y)
  /**
   * When true, the container becomes a vertical flex layout so slotted content
   * using `flex: 1` expands to fill the background's full height. Use when the
   * child (e.g. a table or list) should grow to match the outer container
   * rather than size to its own intrinsic height.
   */
  fill = input<boolean>(false);

  protected containerClass = computed(() => cardClass({ fill: this.fill(), sliced: this.slicedLeftCorner() }));

  /** The corner slice is data-driven (slicePercentage), so it stays a style binding. */
  protected clipPath = computed(() => {
    if (!this.slicedLeftCorner()) return null;
    const x = this.slicePercentage();
    return `polygon(${x}px 0, 100% 0, 100% 100%, 0 100%, 0 ${x + 20}px)`;
  });
}
