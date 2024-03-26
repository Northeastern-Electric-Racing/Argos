import { Component, Input } from '@angular/core';

/**
 * Component that is essentially the template/background for
 * info displayed on the dashboard
 */

@Component({
  selector: 'info-background',
  templateUrl: './info-background.component.html',
  styleUrls: ['./info-background.component.css']
})
export class InfoBackgroundComponent {
  @Input() icon?: string;
  @Input() svgIcon?: string;
  @Input() title!: string;
  @Input() onClick!: () => void;
}
