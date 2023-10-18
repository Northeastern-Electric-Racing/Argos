import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';
import { ServerData } from 'src/utils/socket.utils';
import Storage from './storage.service';

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
  receiveData(storage: Storage) {
    this.socket.on('message', (message: string) => {
      try {
        const data = JSON.parse(message) as ServerData;
        const key = JSON.stringify({
          name: data.name,
          unit: data.unit
        });
        const value = storage.get(key);
        const newValue = { value: data.value, timestamp: data.timestamp };
        value ? storage.set(key, value.concat(newValue)) : storage.set(key, [newValue]);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
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
