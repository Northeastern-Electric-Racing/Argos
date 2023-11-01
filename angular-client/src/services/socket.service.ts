import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';
import { ServerData } from 'src/utils/socket.utils';
import Storage from './storage.service';
import { Observable, Observer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
/**
 * Service for interacting with the socket
 */
export class SocketService {
  private socket: Socket;

  /**
   * Constructor
   * @param socket The socket to communicate with the server
   */
  constructor(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Subscribe to the 'message' event from the server
   */
  receiveData(storage: Storage): Observable<ServerData> {
    return new Observable((observer: Observer<ServerData>) => {
      this.socket.on('message', (message: string) => {
        try {
          const data = JSON.parse(message) as ServerData;
          observer.next(data); // Notify any subscribers with the new data

          const key = JSON.stringify({
            name: data.name,
            unit: data.unit
          });
          const value = storage.get(key);
          const newValue = { value: data.value, timestamp: data.timestamp };
          value ? storage.set(key, value.concat(newValue)) : storage.set(key, [newValue]);
        } catch (error) {
          if (error instanceof Error) {
            this.sendError(error.message);
            observer.error(error); // Notify any subscribers about the error
          }
        }
      });

      return () => {
        this.socket.off('message'); // Unsubscribe from the 'message' event when there are no more subscribers
      };
    });
  }

  /**
   * Sends an error message to the server
   * @param message The error message to send to the server
   */
  sendError(message: string) {
    this.socket.emit('error', message);
  }
}
