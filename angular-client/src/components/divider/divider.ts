import { Component, Input } from '@angular/core';

@Component({
  selector: 'divider',
  templateUrl: './divider.html',
  styleUrls: ['./divider.css']
})
export class Divider {
  @Input() height: number = 100;
}
