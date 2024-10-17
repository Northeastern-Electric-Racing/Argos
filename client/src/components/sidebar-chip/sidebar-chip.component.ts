import { Component, Input } from '@angular/core';

@Component({
  selector: 'sidebar-chip',
  templateUrl: './sidebar-chip.component.html',
  styleUrls: ['./sidebar-chip.component.css']
})
export default class SidebarChip {
  @Input() icon: string = '';
  @Input() value: string = '';
}
