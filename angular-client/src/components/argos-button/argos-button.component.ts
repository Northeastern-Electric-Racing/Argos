import { Component, computed, input } from '@angular/core';

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
export class ButtonComponent {
  label = input.required<string>();
  onClick = input.required<() => void>();
  additionalStyles = input<string>();
  disabled = input<boolean>(false);
  style = computed(() => {
    const base = 'width: 140px; height: 45px; ';
    const extra = this.additionalStyles();
    return extra ? base + extra : base;
  });
}
