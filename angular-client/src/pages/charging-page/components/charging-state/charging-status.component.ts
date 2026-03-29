import { Component, Input, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import CurrentTotalTimerComponent from 'src/components/current-total-timer/current-total-timer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'charging-status',
  templateUrl: './charging-status.component.html',
  styleUrls: ['./charging-status.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, CurrentTotalTimerComponent, HStackComponent]
})
export default class ChargingStatusComponent implements OnInit {
  @Input() displayLight: boolean = true;
  private storage = inject(Storage);
  isCharging: boolean = false;
  currentSeconds: number = 0;
  totalSeconds: number = Number(sessionStorage.getItem('charging-total-seconds')) || 0;
  intervalId!: NodeJS.Timeout;

  ngOnInit() {
    this.storage.getTimerData(topics.charging()).subscribe((value) => {
      const chargingControlValue = value.last_value;
      if (this.isCharging) {
        if (chargingControlValue === 1) {
          this.isCharging = false;
          this.currentSeconds = 0;
        }
      } else if (chargingControlValue === 0) {
        this.isCharging = true;
      }

      if (chargingControlValue === 0) {
        this.currentSeconds = (Date.now() - value.last_change) / 1000;
      }
      this.totalSeconds = Math.round(
        value.total_time_per_value_map[0].reduce((acc, currVal) => acc + (currVal.end_time - currVal.start_time), 0) / 1000 +
          this.currentSeconds
      );
    });
  }

  getChargingState(connected: boolean) {
    return connected ? 'PAUSED' : 'NOT PAUSED';
  }

  getStateColor(isCharging: boolean) {
    return isCharging ? 'yellow' : Theme.infoBackground;
  }
}
