import { Component, input, Input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { SelectorConfig } from '../select-dropdown/select-dropdown.component';

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
  styleUrls: ['./info-background.component.css']
})
export class InfoBackgroundComponent {
  @Input() icon?: string;
  @Input() svgIcon?: string;
  @Input() backgroundColor?: string = Theme.infoBackground;
  @Input() title!: string;
  @Input() onClick!: (() => void) | undefined;
  @Input() button?: ButtonInputs;
  selectorConfig = input<SelectorConfig | undefined>(undefined);
  topRightInfo = input<string | undefined>(undefined);

  slicedLeftCorner = input<boolean>(false); // slice out the upper left corner
}
