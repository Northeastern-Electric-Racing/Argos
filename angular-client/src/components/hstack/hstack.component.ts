import { Component, Input } from '@angular/core';

@Component({
  selector: 'hstack',
  templateUrl: './hstack.component.html',
  styleUrls: ['./hstack.component.css']
})
export default class HStack {
  @Input() spacing: string = '20px';
}
