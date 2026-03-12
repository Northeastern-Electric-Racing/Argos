import { Component, input, OnInit } from '@angular/core';

/**
 * Simple custom button component that does something on click
 * Takes label and onClick function as inputs
 * Currently has one set button style but can be expanded to have more customizable styles
 */
@Component({
  selector: 'argos-button',
  templateUrl: './argos-button.component.html',
  styleUrls: ['./argos-button.component.css'],
  standalone: true
})
export class ButtonComponent implements OnInit {
  label = input.required<string>();
  onClick = input.required<() => void>();
  additionalStyles = input<string>();
  style!: string;

  ngOnInit(): void {
    this.style = 'width: 140px; height: 45px; ';

    if (this.additionalStyles) {
      this.style += this.additionalStyles();
    }
  }
}
