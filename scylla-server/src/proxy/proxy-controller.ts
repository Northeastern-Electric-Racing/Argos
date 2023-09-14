import { Socket } from 'socket.io';
import { ClientMessage, ServerMessage } from '../utils/message.utils';

/**
 * Proxy Controller To Handle Inputting and Outputting Messages to a Client
 */
export default class ProxyController {
  messageMap: Map<string, (data: JSON) => void>;
  socket: Socket;
  server?: boolean;

  /**
   * Constructor
   * @param messageMap A map of input arguments to functions that handle the input
   * @param socket the socket to send and receive messages from
   * @param server whether or not this is a server socket
   */
  constructor(messageMap: Map<string, (data: JSON) => void>, socket: Socket, server?: boolean) {
    this.messageMap = messageMap;
    this.socket = socket;
    this.server = server;
  }

  /**
   * Handles a message received from the client
   * @param data The data received from the client
   */
  private handleClientMessage = (data: any): void => {
    try {
      const decodedMessage: ClientMessage = JSON.parse(data) as ClientMessage;
      const responseFunction = this.messageMap.get(data.argument);
      if (responseFunction) {
        const responseData = responseFunction(decodedMessage.data);
        this.socket.emit('message', responseData);
      } else {
        throw new Error('Invalid Argument');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.socket.emit('Error', error.message);
      }
      console.log('error in message', error);
    }
  };

  /**
   * Handles a message received from the server
   * @param data The data received from the server
   */
  private handleServerMessage = (data: any) => {
    try {
      const decodedMessage: ServerMessage = JSON.parse(data) as ServerMessage;
      console.log(decodedMessage);
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
    this.socket.on('message', this.server ? this.handleServerMessage : this.handleClientMessage);
    this.socket.on('disconnect', this.handleDisconnect);
  };

  /**
   * Configures the proxy controller
   */
  public configure = (): void => {
    this.handleConnection();
  };
}
