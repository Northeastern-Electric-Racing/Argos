import { ErrorEvent, Event, MessageEvent, WebSocket } from 'ws';
import { Topic } from '../utils/topics.utils';
import { SubscriptionMessage } from '../utils/message.utils';

export default class ProxyClient {
  socket: WebSocket;

  constructor(socket: WebSocket) {
    this.socket = socket;
  }

  private subscribeToTopics = (topics: Topic[]) => {
    const subscriptionMessage: SubscriptionMessage = {
      argument: 'subscribe',
      topics
    };
    this.socket.send(JSON.stringify(subscriptionMessage));
  };

  private handleClose = (event: Event) => {
    console.log('Disconnected from Siren');
  };

  private handleOpen = (event: Event) => {
    console.log('Connected to Siren', event);
    this.subscribeToTopics(Object.values(Topic));
  };

  private handleMessage = (message: MessageEvent) => {
    console.log('Received Message: ', message);
  };

  private handleError = (error: ErrorEvent) => {
    console.log('Error Encountered: ', error.message);
  };

  public configure = () => {
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onerror = this.handleError;
    this.socket.onclose = this.handleClose;
  };
}
