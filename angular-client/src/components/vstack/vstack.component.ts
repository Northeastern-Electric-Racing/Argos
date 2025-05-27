import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'vstack',
  templateUrl: './vstack.component.html',
  styleUrls: ['./vstack.component.css'],
  standalone: true,
  imports: [NgStyle]
})
export default class VStackComponent {
  @Input() spacing: string = '5px';
  @Input() align: string = 'center';
}
