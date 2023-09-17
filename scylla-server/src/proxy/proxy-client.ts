// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorEvent, Event, MessageEvent, WebSocket } from 'ws';
import { ServerMessage, SubscriptionMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';

/**
 * Handler for receiving messages from Siren
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
   * Sends a subscription message to Siren
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
   * Handles disconnecting from Siren
   * @param event The event that triggered the close
   */
  private handleClose = (event: Event) => {
    console.log('Disconnected from Siren', event);
  };

  /**
   * Handles connecting to Siren
   * @param event The event that triggered the open
   */
  private handleOpen = (event: Event) => {
    console.log('Connected to Siren', event);
    this.subscribeToTopics(Object.values(Topic));
  };

  /**
   * Handles messages received from Siren
   * @param message The message received from Siren
   */
  private handleMessage = (message: MessageEvent) => {
    console.log('Received Message: ', message);
    try {
      const data = JSON.parse(message.data.toString()) as ServerMessage;
      this.handleData(data);
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error Decoding Message: ', error.message);
        this.socket.emit('Error', error.message);
      }
    }
  };

  /**
   * Handles receiving data from the car and:
   * 1. Logs the data
   * 2. Sends the data to the client
   * @param data The data received from Siren
   */
  private handleData = (data: ServerMessage) => {
    //TODO: Send data to client
    //TODO: Log data
    console.log('Received Data: ', data);
  };

  /**
   * Handles errors that occur
   * @param error The error that occurred
   */
  private handleError = (error: ErrorEvent) => {
    console.log('Error Encountered: ', error.message);
  };

  /**
   * Configures the proxy client for connecting and disconnecting to/from Siren,
   * sending and receiving messages, and handling errors
   */
  public configure = () => {
    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onerror = this.handleError;
    this.socket.onclose = this.handleClose;
  };
}
