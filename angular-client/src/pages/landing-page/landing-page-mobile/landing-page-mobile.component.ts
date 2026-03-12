import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { DriverComponent } from '../../../components/driver-component/driver-component';
import { AccelerationGraphsComponent } from '../../../components/acceleration-graphs/acceleration-graphs.component';
import { BatteryInfoDisplayComponent } from '../../charging-page/components/battery-info-display/battery-info-display';
import { DatePipe } from '@angular/common';
import RasberryPiComponent from 'src/components/raspberry-pi/raspberry-pi.component';
import MotorInfoComponent from 'src/components/motor-info/motor-info.component';
import AccelerationOverTimeDisplayComponent from 'src/components/acceleration-over-time-display/acceleration-over-time-display.component';
import SpeedOverTimeDisplayComponent from 'src/components/speed-over-time-display/speed-over-time-display.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';
import MqttMobileViewComponent from './mqtt-mobile-view/mqtt-mobile-view.component';

export type MobileTab = 'dashboard' | 'mqtt';

@Component({
  selector: 'landing-page-mobile',
  templateUrl: './landing-page-mobile.component.html',
  styleUrls: ['./landing-page-mobile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TypographyComponent,
    VStackComponent,
    SidebarToggleComponent,
    SpeedOverTimeDisplayComponent,
    DriverComponent,
    AccelerationGraphsComponent,
    BatteryInfoDisplayComponent,
    DatePipe,
    RasberryPiComponent,
    MotorInfoComponent,
    AccelerationOverTimeDisplayComponent,
    MqttMobileViewComponent
  ]
})
export default class LandingPageMobileComponent {
  time = input.required<Date>();

  activeTab = signal<MobileTab>('dashboard');

  setTab(tab: MobileTab): void {
    this.activeTab.set(tab);
  }
}
