import { Component, OnInit, inject } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from 'src/environment/environment';
import { CellService } from 'src/services/cell.service';
import { HeatMapService } from 'src/services/heat-map.service';
import SocketService from 'src/services/socket.service';
import Storage from 'src/services/storage.service';

/**
 * Container for the entire application, contains the socket service, API serivce, and storage service.
 */
@Component({
  selector: 'app-context',
  templateUrl: './app-context.component.html'
})
export default class AppContextComponent implements OnInit {
  private storage = inject(Storage);
  private cellService = new CellService(this.storage);
  private heatmapService = inject(HeatMapService);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket = io((environment as any).url || 'http://localhost:8000');
  socketService = new SocketService(this.socket);

  ngOnInit(): void {
    this.cellService.updateCellInfo();
    this.socketService.receiveData(this.storage);
  }
}
