import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Simple custom button component that does something on click
 * Takes label and onClick function as inputs
 * Currently has one set button style but can be expanded to have more customizable styles
 */
@Component({
  selector: 'argos-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent {
  @Input() label!: string;
  @Input() functionCall!: string;
  @Output() onClick = new EventEmitter<any>();

  onClickButton(event: any) {
    this.onClick.emit(event);
  }
}
