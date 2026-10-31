import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiTextfield } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';

@Component({
  selector: 'setting-input',
  templateUrl: './setting-input.component.html',
  styleUrls: ['./setting-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TuiTextfield, TuiInputNumber]
})
export default class SettingInputComponent {
  label = input.required<string>();
  value = model<number | undefined>();
  min = input<number>();
  max = input<number>();

  // Taiga's number input already clamps to [min, max]; an emptied field leaves the setting unset
  onValueChange(num: number | null) {
    this.value.set(num ?? undefined);
  }
}
