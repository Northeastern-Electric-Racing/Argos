import { ChangeDetectionStrategy, Component, input, output, viewChildren } from '@angular/core';
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
  sendCommand = output<{ title: string; values: number[] }>();

  private rowComponents = viewChildren(CommandRowComponent);

  handleSend = () => {
    this.sendCommand.emit({
      title: this.command().title,
      values: this.rowComponents().map((r) => r.value())
    });
  };
}
