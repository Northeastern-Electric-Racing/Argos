import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import Theme from 'src/services/theme.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
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
  private router = inject(Router);
  private topicSelectionService = inject(TopicSelectionService);

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

  /**
   * Topics this widget displays. When set, the title bar shows a graph link that
   * opens the graph page with exactly these topics selected.
   */
  graphTopics = input<string[]>([]);

  openGraph = (event: MouseEvent) => {
    event.stopPropagation(); // don't also fire the card's onClick
    // The graph page only adds ?topics= to the current selection, so clear it to replace it
    this.topicSelectionService.clearSelection();
    this.router.navigate([appRoutes.graphRoute()], {
      queryParams: { topics: this.graphTopics().join(',') }
    });
  };
}
