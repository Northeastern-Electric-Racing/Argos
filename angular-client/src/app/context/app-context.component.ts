import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CellService } from 'src/services/cell.service';
import { FaultService } from 'src/services/fault.service';
import SocketService from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { ToastHostComponent } from 'src/ui/toast/toast-host.component';
import { AppNavBarComponent } from '../app-nav-bar/app-nav-bar.component';
import { RouterOutlet } from '@angular/router';
import { UiIconRegistry } from 'src/ui/icon/icon-registry';
import { NotificationLogService } from 'src/services/notification-log.service';

/** The SVG icons `<ui-icon svg>` draws, by name (UiIconRegistry). */
const SVG_ICONS: Record<string, string> = {
  steering_wheel: 'assets/icons/search_hands_free.svg',
  wifi: 'assets/icons/wifi.svg',
  speed: 'assets/icons/speed.svg',
  person: 'assets/icons/person.svg',
  eye: 'assets/icons/eye_tracking.svg',
  timelapse: 'assets/icons/timelapse.svg',
  cell_tower: 'assets/icons/cell_tower.svg',
  map: 'assets/icons/map.svg',
  '360': 'assets/icons/360.svg',
  electric_car: 'assets/icons/electric_car.svg',
  memory: 'assets/icons/memory.svg',
  back_hand: 'assets/icons/back_hand.svg',
  battery_charging_full: 'assets/icons/battery_charging_full.svg',
  menu: 'assets/icons/menu.svg',
  logo: 'assets/icons/logo.svg',
  home: 'assets/icons/home.svg',
  bar_chart: 'assets/icons/bar_chart.svg',
  search: 'assets/icons/search.svg',
  arrow_right: 'assets/icons/arrow_right.svg',
  ev_station: 'assets/icons/ev_station.svg',
  device_thermostat: 'assets/icons/device_thermostat.svg',
  electric_meter: 'assets/icons/electric_meter.svg',
  warning: 'assets/icons/warning.svg',
  electrical_services: 'assets/icons/electrical_services.svg',
  thermostat: 'assets/icons/thermostat.svg',
  model_training: 'assets/icons/model_training.svg',
  quickreply: 'assets/icons/quickreply.svg',
  bolt: 'assets/icons/bolt.svg',
  timer: 'assets/icons/timer.svg',
  action_key: 'assets/icons/action_key.svg',
  apps: 'assets/icons/apps.svg',
  battery_charging_2: 'assets/icons/battery_charging_2.svg',
  error: 'assets/icons/alert-triangle.svg',
  battery: 'assets/icons/battery.svg',
  linked_camera: 'assets/icons/linked_camera.svg',
  more_horiz: 'assets/icons/more_horiz.svg',
  edit: 'assets/icons/edit.svg',
  notifications: 'assets/icons/notifications.svg'
};

/**
 * Container for the entire application, contains the socket service, API serivce, and storage service.
 */
@Component({
  selector: 'app-context',
  templateUrl: './app-context.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ToastHostComponent, AppNavBarComponent, RouterOutlet]
})
export default class AppContextComponent implements OnInit {
  private storage = inject(Storage);
  private cellService = inject(CellService);
  private faultService = inject(FaultService);
  private notificationLogService = inject(NotificationLogService);
  socketService = inject(SocketService);

  constructor() {
    inject(UiIconRegistry).register(SVG_ICONS);
  }

  ngOnInit(): void {
    this.cellService.updateCellInfo();
    this.socketService.receiveData(this.storage, this.faultService, this.notificationLogService);
  }
}
