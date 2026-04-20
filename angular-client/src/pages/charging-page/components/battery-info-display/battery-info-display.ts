import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import Storage from 'src/services/storage.service';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import BatteryInfoDesktopComponent from './battery-info-desktop/battery-info-desktop.component';
import BatteryInfoMobileComponent from './battery-info-mobile/battery-info-mobile.component';

@Component({
  selector: 'battery-info-display',
  templateUrl: './battery-info-display.html',
  styleUrls: ['./battery-info-display.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, BatteryInfoDesktopComponent, BatteryInfoMobileComponent]
})
export class BatteryInfoDisplayComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  voltage: number = 0;
  packTemp: number = 0;
  stateOfCharge: number = 0;
  chargeCurrentLimit: number = 0;
  dischargeCurrentLimit: number = 0;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.subscriptions.push(
      this.storage.get(topics.packTemp()).subscribe((value) => {
        this.packTemp = floatPipe(value.values[0]);
      }),
      this.storage.get(topics.packVoltage()).subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      }),
      this.storage.get(topics.stateOfCharge()).subscribe((value) => {
        this.stateOfCharge = floatPipe(value.values[0]);
      }),
      this.storage.get(topics.chargeCurrentLimit()).subscribe((value) => {
        this.chargeCurrentLimit = floatPipe(value.values[0]);
      }),
      this.storage.get(topics.dischargeCurrentLimit()).subscribe((value) => {
        this.dischargeCurrentLimit = floatPipe(value.values[0]);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
