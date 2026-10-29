import { Injectable, inject } from '@angular/core';
import { io } from 'socket.io-client';
import { DataValue, ServerData, TimerData } from 'src/utils/socket.utils';
import Storage from './storage.service';
import { topics } from 'src/utils/topic.utils';
import { FaultData, RuleNotification } from 'src/utils/types.utils';
import { FaultService } from './fault.service';
import { NotificationLogService } from './notification-log.service';
import { EnvService } from './env.service';
import { v4 as uuidv4 } from 'uuid';

// crypto.randomUUID is only defined in secure contexts (https or loopback);
// uuidv4 falls back to crypto.getRandomValues so it works on insecure origins.
function getOrCreateClientId(): string {
  const key = 'notification_rules_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  return id;
}

// The server gives up on a client after three missed check-ins (15s)
const CHECK_IN_INTERVAL_MS = 5000;

export interface RuleCheckIn {
  stream: string | null;
  last_seq: number;
}

/**
 * Tracks which numbered rule notifications have been received, so resends are skipped and the
 * client can check in with the last one it got with no gaps before it.
 */
export class RuleNotificationTracker {
  private stream: string | null = null;
  private lastSeq = 0;
  // received past a gap, waiting for the gap to fill
  private ahead = new Set<number>();

  constructor(private addNotification: (notification: RuleNotification) => void) {}

  /** Adds a notification not seen before. Throws without counting it if adding fails. */
  receive(message: RuleNotification): void {
    if (message.stream !== this.stream) {
      this.stream = message.stream;
      this.lastSeq = 0;
      this.ahead.clear();
    }
    if (message.seq <= this.lastSeq || this.ahead.has(message.seq)) return;

    this.addNotification(message);
    this.ahead.add(message.seq);
    while (this.ahead.delete(this.lastSeq + 1)) this.lastSeq++;
  }

  checkIn(): RuleCheckIn {
    return { stream: this.stream, last_seq: this.lastSeq };
  }
}

/**
 * Service for interacting with the socket
 */
@Injectable({
  providedIn: 'root'
})
export default class SocketService {
  private envService = inject(EnvService);
  // Opens the connection on construction; specs that inject SocketService (or render AppContext) should provide a mock.
  private socket = io(this.envService.backendUrl, {
    query: {
      clientId: getOrCreateClientId()
    }
  });
  private lastLatencyTimestamp: number = 0;

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

    const tracker = new RuleNotificationTracker((notification) => notificationLogService.addNotification(notification));
    this.socket.on('rule_notify', (message: RuleNotification) => {
      try {
        tracker.receive(message);
      } catch (error) {
        if (error instanceof Error) this.sendError(error.message);
      }
    });
    // check in on every (re)connect and regularly after, so the server resends what was missed
    const checkIn = () => {
      if (this.socket.connected) this.socket.emit('rule_checkin', tracker.checkIn());
    };
    this.socket.on('connect', checkIn);
    setInterval(checkIn, CHECK_IN_INTERVAL_MS);

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
