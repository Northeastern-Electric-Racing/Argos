import { Component, Input } from '@angular/core';

@Component({
  selector: 'sidebar-chip',
  templateUrl: './sidebar-chip.component.html',
  styleUrls: ['./sidebar-chip.component.css']
})
export default class SidebarChipComponent {
  @Input() icon: string = '';
  @Input() value: string = '';
  @Input() active: boolean = false; // New input to control active state
}
