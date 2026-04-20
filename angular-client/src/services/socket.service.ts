import { Socket } from 'socket.io-client';
import { DataValue, ServerData, TimerData } from 'src/utils/socket.utils';
import Storage from './storage.service';
import { topics } from 'src/utils/topic.utils';
import { FaultData, RuleNotification } from 'src/utils/types.utils';
import { FaultService } from './fault.service';
import { NotificationLogService } from './notification-log.service';

/**
 * Service for interacting with the socket
 */
export default class SocketService {
  private socket: Socket;
  private lastLatencyTimestamp: number = 0;

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
  receiveData = (storage: Storage, faultService: FaultService, notificationLogService: NotificationLogService) => {
    this.socket.on('data', (message: string) => {
      try {
        const data = JSON.parse(message) as ServerData;
        storage.setCurrentRunId(data.runId);

        const key = data.name;
        const newValue: DataValue = { values: data.values, time: data.timestamp.toString(), unit: data.unit };
        storage.addValue(key, newValue);
        if (Date.now() - this.lastLatencyTimestamp > 1000) {
          const latency = Date.now() - data.timestamp;
          storage.addValue(topics.latency(), {
            values: [latency.toString()],
            time: data.timestamp.toString(),
            unit: 'ms'
          });
          this.lastLatencyTimestamp = Date.now();
        }
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });

    this.socket.on('faults', (message: string) => {
      try {
        const data = this.transformFaultData(JSON.parse(message));
        faultService.addFault(data);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });

    this.socket.on('metadata', (message: string) => {
      try {
        const data = JSON.parse(message) as ServerData;
        storage.setCurrentRunId(data.runId);

        const key = data.name;
        const newValue: DataValue = { values: data.values, time: data.timestamp.toString(), unit: data.unit };
        storage.addValue(key, newValue);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });

    this.socket.on('timers', (message: string) => {
      try {
        const data = JSON.parse(message) as TimerData;
        const key = data.topic;
        storage.addTimerValue(key, data);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });

    this.socket.on('rule_notify', (message: RuleNotification) => {
      try {
        notificationLogService.addNotification(message);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformFaultData = (data: any): FaultData[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((fault: any) => ({
      ...fault,
      occurredAt: new Date(fault.occured_at),
      lastSeen: new Date(fault.last_seen)
    }));
  };
}
