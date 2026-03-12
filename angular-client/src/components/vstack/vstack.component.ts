import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'vstack',
  templateUrl: './vstack.component.html',
  styleUrls: ['./vstack.component.css'],
  standalone: true,
  imports: [NgStyle]
})
export default class VStackComponent {
  spacing = input<string>('5px');
  align = input<string>('center');
}
