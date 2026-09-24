import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'sidebar-chip',
  templateUrl: './sidebar-chip.component.html',
  styleUrls: ['./sidebar-chip.component.css'],
  standalone: true,
  imports: [MatIcon, TypographyComponent]
})
export default class SidebarChipComponent {
  icon = input<string>('');
  value = input<string>('');
  active = input<boolean>(false); // New input to control active state
  small = input<boolean>(false);
}
