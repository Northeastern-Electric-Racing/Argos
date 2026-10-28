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

// More than the server holds unacked per client, so a resend is always recognised
const MAX_SEEN_NOTIFICATION_IDS = 500;

/**
 * Builds the rule_notify handler: skips notifications already received (the server resends
 * unacked ones on reconnect), logs new ones, then acks. Throws without acking if logging fails,
 * so the server keeps it pending and resends it.
 */
export function createRuleNotifyHandler(addNotification: (notification: RuleNotification) => void) {
  const seen = new Set<string>();
  return (message: RuleNotification, ack: () => void) => {
    if (!seen.has(message.notification_id)) {
      addNotification(message);
      seen.add(message.notification_id);
      if (seen.size > MAX_SEEN_NOTIFICATION_IDS) {
        seen.delete(seen.values().next().value!);
      }
    }
    ack();
  };
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

    const handleRuleNotify = createRuleNotifyHandler((notification) => notificationLogService.addNotification(notification));
    this.socket.on('rule_notify', (message: RuleNotification, ack: () => void) => {
      try {
        handleRuleNotify(message, ack);
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
