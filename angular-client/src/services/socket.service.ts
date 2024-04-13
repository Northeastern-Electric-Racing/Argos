import { Socket } from 'socket.io-client';
import { DataValue, ServerData } from 'src/utils/socket.utils';
import Storage from './storage.service';

/**
 * Service for interacting with the socket
 */
export default class SocketService {
  private socket: Socket;
  private lastTimestamp: number = 0;

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
  receiveData = (storage: Storage) => {
    this.socket.on('message', (message: string) => {
      // if (Date.now() - this.lastTimestamp < storage.getResolution()) return;
      this.lastTimestamp = Date.now();
      try {
        /* Parse the message and store it in the storage service */

        const data = JSON.parse(message) as ServerData;
        storage.setCurrentRunId(data.runId);

        /* Create key based on name and unit for hashmap */
        const key = data.name;

        const newValue: DataValue = { values: data.values, time: data.timestamp.toString(), unit: data.unit };
        storage.addValue(key, newValue);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });

    this.socket.on('disconnect', () => {
      storage.setCurrentRunId(undefined);
    });
  };

  /**
   * Sends an error message to the server
   * @param message The error message to send to the server
   */
  sendError = (message: string) => {
    this.socket.emit('error', message);
  };
}
