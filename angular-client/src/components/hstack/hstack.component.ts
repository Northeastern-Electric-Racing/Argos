import { Component, Input, OnInit } from '@angular/core';
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
export default class HStackComponent implements OnInit {
  @Input() spacing: string = '20px';
  @Input() justifyContent: JusitfyContent = 'center';
  @Input() alignItems: AlignItems = 'center';

  alignment!: string;

  ngOnInit() {
    this.alignment = `${this.justifyContent} ${this.alignItems}`;
  }
}
