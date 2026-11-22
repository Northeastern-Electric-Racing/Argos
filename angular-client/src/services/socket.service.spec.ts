import { TestBed } from '@angular/core/testing';
import { ManagerOptions, SocketOptions } from 'socket.io-client';
import { EnvService } from './env.service';
import SocketService, { SOCKET_IO } from './socket.service';
import Storage, { TOPIC_SWEEP_MS } from './storage.service';

/** Stands in for a socket.io-client socket: records emits and plays connections. */
class FakeSocket {
  connected = false;
  emitted: unknown[][] = [];
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

  /** The server accepted a connection, first or reconnect. */
  connect(): void {
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

/** Ends the task, which sends the topics added in it. */
const endTask = () => Promise.resolve();
/** Runs the next sweep, which removes the topics nothing reads any more. */
const sweep = () => vi.advanceTimersByTime(TOPIC_SWEEP_MS);

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

  it('connects with the clientId and the subscriptions flag, and nothing in auth', () => {
    expect(socket.options.query).toEqual({ clientId: expect.any(String), subscriptions: '1' });
    expect(socket.options.auth).toBeUndefined();
  });

  it('sends no list on connect when nothing is read yet', () => {
    socket.connect();
    expect(socket.subscriptions()).toEqual([]);
  });

  it('sends the topics already read as soon as it connects', async () => {
    storage.get('A/B').subscribe();
    await endTask();
    socket.connect();
    expect(socket.lists()).toEqual([{ seq: 1, topics: ['A/B'] }]);
  });

  it('sends exactly the topics a page opens with, in one message', async () => {
    socket.connect();
    ['C/D', 'A/B', 'A/B'].forEach((topic) => storage.get(topic).subscribe());
    await endTask();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D']]);
  });

  it('sends one list at the sweep after a page leaves, however many topics it read', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    const page = ['C/D', 'E/F', 'G/H'].map((topic) => storage.get(topic).subscribe());
    await endTask();
    page.forEach((subscription) => subscription.unsubscribe());
    await endTask();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D', 'E/F', 'G/H']]);
    sweep();
    expect(socket.subscriptions()).toEqual([['A/B', 'C/D', 'E/F', 'G/H'], ['A/B']]);
  });

  it("on a page switch, adds the new page's topics at once and removes the old page's at the sweep", async () => {
    socket.connect();
    const leaving = ['A/B', 'C/D'].map((topic) => storage.get(topic).subscribe());
    await endTask();
    leaving.forEach((subscription) => subscription.unsubscribe());
    ['C/D', 'E/F'].forEach((topic) => storage.get(topic).subscribe());
    await endTask();
    sweep();
    expect(socket.subscriptions()).toEqual([
      ['A/B', 'C/D'],
      ['A/B', 'C/D', 'E/F'],
      ['C/D', 'E/F']
    ]);
  });

  it('numbers each list higher than the last, across reconnects', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    await endTask();
    socket.disconnect();
    socket.connect();
    storage.get('C/D').subscribe();
    await endTask();
    expect(socket.lists().map(({ seq }) => seq)).toEqual([1, 2, 3]);
  });

  it('restores the same topics on reconnect', async () => {
    socket.connect();
    storage.get('A/B').subscribe();
    await endTask();
    socket.disconnect();
    socket.connect();
    expect(socket.subscriptions()).toEqual([['A/B'], ['A/B']]);
  });

  it('sends nothing while disconnected and the latest list on the next connect', async () => {
    socket.connect();
    socket.disconnect();
    storage.get('A/B').subscribe();
    await endTask();
    expect(socket.subscriptions()).toEqual([]);
    socket.connect();
    expect(socket.subscriptions()).toEqual([['A/B']]);
  });
});
