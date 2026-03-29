import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';

type JusitfyContent = 'space-between' | 'space-around' | 'space-evenly' | 'center' | 'start' | 'end';

type AlignItems = 'center' | 'start' | 'end' | 'stretch';

@Component({
  selector: 'hstack',
  templateUrl: './hstack.component.html',
  styleUrls: ['./hstack.component.css'],
  standalone: true,
  imports: [NgStyle]
})
export default class HStackComponent {
  spacing = input<string>('20px');
  justifyContent = input<JusitfyContent>('center');
  alignItems = input<AlignItems>('center');
}
