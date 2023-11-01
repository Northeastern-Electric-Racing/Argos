import { Component, Input, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import APIService from 'src/services/api.service';
import { SocketService } from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/ImportantDataType';
import { DataValue } from 'src/utils/socket.utils';

@Component({
  selector: 'graph-info',
  styleUrls: ['./graph-caption.component.css'],
  templateUrl: './graph-caption.component.html'
})
export class GraphInfoComponent {
  @Input() dataType: string | number = '';
  @Input() currentValue: string | number = '';
  @Input() unit: string | number = '';
  @Input() currentDriver: string | number = '';
  @Input() currentSystem: string | number = '';
  @Input() currentLocation: string | number = '';
  @Input() runId: string | number = '';
}
