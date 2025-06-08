import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Chip, chipToString } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';

@Component({
  selector: 'acc-high-voltage',
  templateUrl: './acc-high-voltage.component.html',
  styleUrl: './acc-high-voltage.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent]
})
export class AccHighVoltageComponent implements OnInit, OnDestroy {
  storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  voltsHighValue: number | undefined = undefined;
  voltsHighChip: Chip | undefined = undefined;
  voltsHighCell: number | undefined = undefined;

  ngOnInit(): void {
    this.subscriptions.push(
      this.storage.get(topics.highVoltsValue()).subscribe((value) => {
        this.voltsHighValue = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.highVoltsChip()).subscribe((value) => {
        const chipValue = parseInt(value.values[0]);
        if (chipValue % 2 === 0) {
          this.voltsHighChip = Chip.Alpha;
        } else {
          this.voltsHighChip = Chip.Beta;
        }
      }),
      this.storage.get(topics.highVoltsCell()).subscribe((value) => {
        this.voltsHighCell = parseInt(value.values[0]);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getInfoBackgroundTitle = () => {
    const cellTitle = this.voltsHighCell !== undefined ? `Cell: ${this.voltsHighCell}` : 'No Cell';
    const chipTitle = this.voltsHighChip !== undefined ? `Chip: ${chipToString(this.voltsHighChip, true)}` : 'No Chip';
    return `${cellTitle} | ${chipTitle}`;
  };
}
