import { Component, Input } from '@angular/core';
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
  @Input() icon: string = '';
  @Input() value: string = '';
  @Input() active: boolean = false; // New input to control active state
}
