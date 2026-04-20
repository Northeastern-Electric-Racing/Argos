import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import { CarCommand } from 'src/utils/types.utils';
import CommandRowComponent from './command-row/command-row.component';

@Component({
  selector: 'command-card',
  templateUrl: './command-card.component.html',
  styleUrls: ['./command-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InfoBackgroundComponent, ButtonComponent, CommandRowComponent]
})
export default class CommandCardComponent {
  command = input.required<CarCommand>();
  sendCommand = output<{ title: string; value: number }>();

  private value = signal<number>(0);

  protected onValueChange(value: number) {
    this.value.set(value);
  }

  handleSend = () => {
    this.sendCommand.emit({ title: this.command().title, value: this.value() });
  };
}
