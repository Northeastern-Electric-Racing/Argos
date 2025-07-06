import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  styleUrls: ['./setting-input.component.css'],
  standalone: true,
  imports: [FormsModule, InputTextModule, FloatLabel]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = model<number | undefined>();
}
