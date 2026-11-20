import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { io } from 'socket.io-client';
import { DataValue, ServerData, TimerData } from 'src/utils/socket.utils';
import Storage from './storage.service';
import { topics } from 'src/utils/topic.utils';
import { FaultData, RuleNotification, RunLaps, Track } from 'src/utils/types.utils';
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

/** Opens the Socket.IO connection; specs provide a fake socket here instead of a server. */
export const SOCKET_IO = new InjectionToken<typeof io>('SOCKET_IO', { providedIn: 'root', factory: () => io });

const sameTopics = (a: string[], b: string[]) => a.length === b.length && a.every((topic, i) => topic === b[i]);

/**
 * Service for interacting with the socket
 */
@Injectable({
  providedIn: 'root'
})
export default class SocketService {
  private envService = inject(EnvService);
  private storage = inject(Storage);
  /** The topic list the server last got from this client, in the handshake or set_subscriptions. */
  private sentTopics: string[] = [];
  // Opens the connection on construction; specs that inject SocketService (or render AppContext) should provide a mock.
  private socket = inject(SOCKET_IO)(this.envService.backendUrl, {
    query: {
      clientId: getOrCreateClientId()
    },
    // Evaluated on every connection attempt, so a reconnect restores the topics read now. Always
    // carries topics, even empty: a client that sends them never receives every topic.
    auth: (cb) => {
      this.sentTopics = this.storage.getTopics();
      cb({ topics: this.sentTopics });
    }
  });
  private lastLatencyTimestamp: number = 0;

  constructor() {
    this.storage
      .topicsChanged()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.syncSubscriptions());
    // The topics can change between sending the handshake and the server accepting it.
    this.socket.on('connect', () => this.syncSubscriptions());
  }

  /**
   * Sends the server the full topic list when it differs from the last one sent. Only while
   * connected: socket.io-client would buffer the emit and replay a stale list after the
   * handshake of the next connection, which already carries the current one.
   */
  private syncSubscriptions = () => {
    const topics = this.storage.getTopics();
    if (!this.socket.connected || sameTopics(topics, this.sentTopics)) return;
    this.sentTopics = topics;
    this.socket.emit('set_subscriptions', topics);
  };

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

    this.socket.on('tracks', (tracks: Track[]) => {
      storage.setTracks(tracks);
    });

    this.socket.on('laps', (laps: RunLaps) => {
      storage.setLiveLaps(laps);
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
