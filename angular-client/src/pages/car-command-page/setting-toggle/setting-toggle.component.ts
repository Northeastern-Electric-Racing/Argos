import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import TypographyComponent from '../../../components/typography/typography.component';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { FormsModule } from '@angular/forms';
import HStackComponent from 'src/components/hstack/hstack.component';

let nextId = 0;

@Component({
  selector: 'setting-toggle',
  templateUrl: './setting-toggle.component.html',
  styleUrls: ['./setting-toggle.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent, FormsModule, NzSwitchModule, HStackComponent]
})
export default class SettingToggleComponent {
  label = input.required<string>();
  value = model<boolean | undefined>();
  readonly switchId = `setting-toggle-${nextId++}`;
}
