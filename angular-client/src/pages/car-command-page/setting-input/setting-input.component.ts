import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  styleUrls: ['./setting-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzInputNumberModule]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = model<number | undefined>();
  // nz-input-number clamps typed values to these bounds on blur
  min = input<number>(-Infinity);
  max = input<number>(Infinity);
}
