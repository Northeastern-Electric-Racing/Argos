import { Component, Input } from '@angular/core';

@Component({
  selector: 'vstack',
  templateUrl: './vstack.component.html',
  styleUrls: ['./vstack.component.css']
})
export default class VStack {
  @Input() spacing: string = '20px';
}
