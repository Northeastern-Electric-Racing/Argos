import { Component, Input } from '@angular/core';

@Component({
  selector: 'graph-info',
  styleUrls: ['./graph-caption.component.css'],
  templateUrl: './graph-caption.component.html'
})
export class GraphInfoComponent {
  @Input() dataType: string = '';
  @Input() currentValue: number = 0;
  @Input() unit: string = '';
  @Input() currentDriver: string | number = '';
  @Input() currentSystem: string | number = '';
  @Input() currentLocation: string | number = '';
}
