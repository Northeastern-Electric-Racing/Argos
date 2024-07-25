import { Component, Input } from '@angular/core';
import Theme from 'src/services/theme.service';

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
  @Input() onClick!: () => void;
  @Input() button?: ButtonInputs;
}
