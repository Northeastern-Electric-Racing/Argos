import { Component, input, Input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { SelectorConfig, SelectDropdownComponent } from '../select-dropdown/select-dropdown.component';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';

/**
 * Component that is essentially the template/background for
 * info displayed on the dashboard
 */

interface ButtonInputs {
  onClick: () => void;
  icon: string;
}

@Component({
  selector: 'info-background',
  templateUrl: './info-background.component.html',
  styleUrls: ['./info-background.component.css'],
  standalone: true,
  imports: [MatIcon, SelectDropdownComponent, TypographyComponent, HStackComponent]
})
export class InfoBackgroundComponent {
  icon = input<string>();
  svgIcon = input<string>();
  backgroundColor = input<Theme>(Theme.infoBackground);
  title = input<string>();
  onClick = input<(() => void) | undefined>(undefined);
  @Input() button?: ButtonInputs;
  selectorConfigs = input<SelectorConfig[]>([]);
  topRightInfo = input<string | undefined>(undefined);
  topRightInfoSize = input<string>('19px');

  slicedLeftCorner = input<boolean>(false); // slice out the upper left corner
  slicePercentage = input<number>(125); // pixel size of the corner slice (used for both clip-path x and y)
}
