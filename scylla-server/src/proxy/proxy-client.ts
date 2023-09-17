import { ErrorEvent, Event, MessageEvent, WebSocket } from 'ws';
import { Topic } from '../utils/topics.utils';
import { SubscriptionMessage } from '../utils/message.utils';

/**
 * Handler for receiving messages from the server
 */
export default class ProxyClient {
  socket: WebSocket;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(socket: WebSocket) {
    this.socket = socket;
  }

  /**
   * Sends a subscription message to the server
   * @param topics The topics to subscribe to
   */
  private subscribeToTopics = (topics: Topic[]) => {
    const subscriptionMessage: SubscriptionMessage = {
      argument: 'subscribe',
      topics
    };
    this.socket.send(JSON.stringify(subscriptionMessage));
  };

  /**
   * Handles disconnecting from the server
   * @param event The event that triggered the close
   */
  private handleClose = (event: Event) => {
    console.log('Disconnected from Siren', event);
  };

  /**
   * Handles connecting to the server
   * @param event The event that triggered the open
   */
  private handleOpen = (event: Event) => {
    console.log('Connected to Siren', event);
    this.subscribeToTopics(Object.values(Topic));
  };

  /**
   * Handles messages received from the server
   * @param message The message received from the server
   */
  private handleMessage = (message: MessageEvent) => {
    console.log('Received Message: ', message);
  };

  /**
   * Handles errors that occur
   * @param error The error that occurred
   */
  private handleError = (error: ErrorEvent) => {
    console.log('Error Encountered: ', error.message);
  };

  /**
   * Configures the proxy client for connecting and disconnecting to/from the server,
   * sending and receiving messages, and handling errors
   */
  public configure = () => {
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onerror = this.handleError;
    this.socket.onclose = this.handleClose;
  };
}
