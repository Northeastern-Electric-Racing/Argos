import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import Storage from 'src/services/storage.service';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import BatteryInfoDesktopComponent from './battery-info-desktop/battery-info-desktop.component';
import BatteryInfoMobileComponent from './battery-info-mobile/battery-info-mobile.component';

@Component({
  selector: 'battery-info-display',
  host: { '(window:resize)': 'onResize()' },
  templateUrl: './battery-info-display.html',
  styleUrls: ['./battery-info-display.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, BatteryInfoDesktopComponent, BatteryInfoMobileComponent]
})
export class BatteryInfoDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  voltage: number = 0;
  packTemp: number = 0;
  stateOfCharge: number = 0;
  chargeCurrentLimit: number = 0;
  dischargeCurrentLimit: number = 0;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.storage
      .get(topics.packTemp())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.packTemp = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.packVoltage())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      });
    this.storage
      .get(topics.stateOfCharge())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.stateOfCharge = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.chargeCurrentLimit())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.chargeCurrentLimit = floatPipe(value.values[0]);
      });
    this.storage
      .get(topics.dischargeCurrentLimit())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.dischargeCurrentLimit = floatPipe(value.values[0]);
      });
  }

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}
