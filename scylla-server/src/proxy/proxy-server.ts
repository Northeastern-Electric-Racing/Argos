import { Socket } from 'socket.io';
import { ClientMessage } from '../utils/message.utils';
import { ResponseFunction } from '../utils/message-maps.utils';

/**
 * Proxy Controller To Handle Inputting and Outputting Messages to a Client
 */
export default class ProxyServer {
  messageMap: Map<string, ResponseFunction>;
  socket: Socket;

  /**
   * Constructor
   * @param messageMap A map of input arguments to functions that handle the input
   * @param socket the socket to send and receive messages from
   */
  constructor(messageMap: Map<string, ResponseFunction>, socket: Socket) {
    this.messageMap = messageMap;
    this.socket = socket;
  }

  /**
   * Handles a received message
   * @param data The data received
   */
  private handleMessage = (data: any): void => {
    try {
      const decodedMessage: ClientMessage = JSON.parse(data) as ClientMessage;
      const responseFunction = this.messageMap.get(decodedMessage.argument);
      if (responseFunction) {
        const responseData = responseFunction(decodedMessage.data);
        this.socket.emit('message', responseData);
      } else {
        throw new Error(`Invalid Argument ${decodedMessage.argument}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.socket.emit('Error', error.message);
      }
      console.log('error in message', error);
    }
  };

  /**
   * Handles a disconnection
   */
  private handleDisconnect = (): void => {
    console.log('disconnected socket');
  };

  /**
   * Handles a connection
   */
  private handleConnection = (): void => {
    console.log('connected socket');
    this.socket.on('message', this.handleMessage);
    this.socket.on('disconnect', this.handleDisconnect);
  };

  /**
   * Configures the proxy controller
   */
  public configure = (): void => {
    this.handleConnection();
  };
}
