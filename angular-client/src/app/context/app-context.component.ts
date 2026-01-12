import { Component, OnInit, inject } from '@angular/core';
import { io } from 'socket.io-client';
import { CellService } from 'src/services/cell.service';
import { FaultService } from 'src/services/fault.service';
import SocketService from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { Toast } from 'primeng/toast';
import { AppNavBarComponent } from '../app-nav-bar/app-nav-bar.component';
import { RouterOutlet } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { EnvService } from 'src/services/env.service';

/**
 * Container for the entire application, contains the socket service, API serivce, and storage service.
 */
@Component({
  selector: 'app-context',
  templateUrl: './app-context.component.html',
  standalone: true,
  imports: [Toast, AppNavBarComponent, RouterOutlet]
})
export default class AppContextComponent implements OnInit {
  private storage = inject(Storage);
  private cellService = new CellService(this.storage);
  private faultService = inject(FaultService);
  private envService = inject(EnvService);
  socket = io(this.envService.backendUrl, { auth: { token: 'some random token' } });
  socketService = new SocketService(this.socket);

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.matIconRegistry
      .addSvgIcon(
        'steering_wheel',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/search_hands_free.svg')
      )
      .addSvgIcon('wifi', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/wifi.svg'))
      .addSvgIcon('speed', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/speed.svg'))
      .addSvgIcon('person', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/person.svg'))
      .addSvgIcon('eye', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/eye_tracking.svg'))
      .addSvgIcon('timelapse', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/timelapse.svg'))
      .addSvgIcon('cell_tower', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/cell_tower.svg'))
      .addSvgIcon('map', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/map.svg'))
      .addSvgIcon('360', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/360.svg'))
      .addSvgIcon('electric_car', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electric_car.svg'))
      .addSvgIcon('memory', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/memory.svg'))
      .addSvgIcon('back_hand', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/back_hand.svg'))
      .addSvgIcon(
        'battery_charging_full',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/battery_charging_full.svg')
      )
      .addSvgIcon('menu', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/menu.svg'))
      .addSvgIcon('logo', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/logo.svg'))
      .addSvgIcon('home', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/home.svg'))
      .addSvgIcon('bar_chart', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/bar_chart.svg'))
      .addSvgIcon('search', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/search.svg'))
      .addSvgIcon('arrow_right', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/arrow_right.svg'))
      .addSvgIcon('ev_station', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/ev_station.svg'))
      .addSvgIcon(
        'device_thermostat',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/device_thermostat.svg')
      )
      .addSvgIcon('electric_meter', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electric_meter.svg'))
      .addSvgIcon('warning', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/warning.svg'))
      .addSvgIcon(
        'electrical_services',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/electrical_services.svg')
      )
      .addSvgIcon('thermostat', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/thermostat.svg'))
      .addSvgIcon('model_training', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/model_training.svg'))
      .addSvgIcon('quickreply', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/quickreply.svg'))
      .addSvgIcon('bolt', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/bolt.svg'))
      .addSvgIcon('timer', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/timer.svg'))
      .addSvgIcon(
        'arrow_drop_down_circle',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assests/icons/arrow_drop_down_circle.svg')
      )
      .addSvgIcon('action_key', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/action_key.svg'))
      .addSvgIcon('apps', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/apps.svg'))
      .addSvgIcon(
        'battery_charging_2',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/battery_charging_2.svg')
      )
      .addSvgIcon('error', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/alert-triangle.svg'))
      .addSvgIcon('linked_camera', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/linked_camera.svg'))
      .addSvgIcon('more_horiz', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/more_horiz.svg'))
      .addSvgIcon('edit', this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/icons/edit.svg'));
  }

  ngOnInit(): void {
    document.documentElement.classList.add('dark-mode-always');
    this.cellService.updateCellInfo();
    this.socketService.receiveData(this.storage, this.faultService);
  }
}
