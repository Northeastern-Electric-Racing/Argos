import { TestBed } from '@angular/core/testing';
import { ManagerOptions, SocketOptions } from 'socket.io-client';
import { EnvService } from './env.service';
import SocketService, { SOCKET_IO } from './socket.service';
import Storage, { TOPIC_LINGER_MS } from './storage.service';

type Auth = (cb: (data: object) => void) => void;

/** Stands in for a socket.io-client socket: records emits and plays connection attempts. */
class FakeSocket {
  connected = false;
  emitted: unknown[][] = [];
  handshakes: object[] = [];
  private handlers = new Map<string, ((...args: unknown[]) => void)[]>();

  constructor(readonly options: Partial<ManagerOptions & SocketOptions>) {}

  on(event: string, handler: (...args: unknown[]) => void): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }

  emit(...args: unknown[]): this {
    this.emitted.push(args);
    return this;
  }

  /** A connection attempt: socket.io-client evaluates the auth callback, then connects. */
  connect(): void {
    this.handshake();
    this.open();
  }

  /** Sends the connect packet, carrying the auth payload. */
  handshake(): void {
    (this.options.auth as Auth)((data) => this.handshakes.push(data));
  }

  /** The server accepted the handshake. */
  open(): void {
    this.connected = true;
    this.handlers.get('connect')?.forEach((handler) => handler());
  }

  disconnect(): void {
    this.connected = false;
    this.handlers.get('disconnect')?.forEach((handler) => handler('transport close'));
  }

  /** The set_subscriptions payloads. */
  lists(): { seq: number; topics: string[] }[] {
    return this.emitted
      .filter(([event]) => event === 'set_subscriptions')
      .map(([, list]) => list as { seq: number; topics: string[] });
  }

  /** The topic lists sent with set_subscriptions. */
  subscriptions(): string[][] {
    return this.lists().map(({ topics }) => topics);
  }
}

/** Lets the microtask that batches a task's topic changes run. */
const flush = () => Promise.resolve();

describe('SocketService (topic subscriptions)', () => {
  let socket: FakeSocket;
  let storage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: EnvService, useValue: { backendUrl: 'http://scylla.test' } },
        {
          provide: SOCKET_IO,
          useValue: (_url: string, options: Partial<ManagerOptions & SocketOptions>) => (socket = new FakeSocket(options))
        }
      ]
    });
    storage = TestBed.inject(Storage);
    TestBed.inject(SocketService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the clientId query parameter', () => {
    expect(socket.options.query).toEqual({ clientId: expect.any(String) });
  });

  it('sends an empty topic list in the handshake when nothing is read yet', () => {
    socket.connect();
    expect(socket.handshakes).toEqual([{ topics: [] }]);
    expect(socket.subscriptions()).toEqual([]);
  });

  it('sends the topics already read in the handshake', async () => {
    storage.get('A/B').subscribe();
    await flush();
    socket.connect();
    expect(socket.handshakes).toEqual([{ topics: ['A/B'] }]);
    expect(socket.subscriptions()).toEqual([]);
  });

  it('sends exactly the topics a page opens with, in one message', async () => {
    socket.connect();
    ['C/D', 'A/B', 'A/B'].forEach((topic) => storage.get(topic).subscribe());
    await flush();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D']]);
  });

  it('sends the full list again when a page leaves, after the linger', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    const leaving = storage.get('C/D').subscribe();
    await flush();
    leaving.unsubscribe();
    vi.advanceTimersByTime(TOPIC_LINGER_MS - 1);
    await flush();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D']]);
    vi.advanceTimersByTime(1);
    await flush();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D'], ['A/B']]);
  });

  it('numbers each list higher than the last, across reconnects', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    await flush();
    socket.disconnect();
    socket.connect();
    storage.get('C/D').subscribe();
    await flush();
    expect(socket.lists().map(({ seq }) => seq)).toEqual([1, 2]);
  });

  it('restores the same topics on reconnect, through the handshake', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    await flush();
    socket.disconnect();
    socket.connect();
    expect(socket.handshakes).toEqual([{ topics: [] }, { topics: ['A/B'] }]);
    expect(socket.subscriptions()).toEqual([['A/B']]);
  });

  it('sends nothing while disconnected and hands the latest list to the next handshake', async () => {
    socket.connect();
    socket.disconnect();
    storage.get('A/B').subscribe();
    await flush();
    expect(socket.subscriptions()).toEqual([]);
    socket.connect();
    expect(socket.handshakes).toEqual([{ topics: [] }, { topics: ['A/B'] }]);
    expect(socket.subscriptions()).toEqual([]);
  });

  it('sends the list on connect when it changed after the handshake was sent', async () => {
    socket.handshake();
    storage.get('A/B').subscribe();
    await flush();
    socket.open();
    expect(socket.handshakes).toEqual([{ topics: [] }]);
    expect(socket.subscriptions()).toEqual([['A/B']]);
  });
});
