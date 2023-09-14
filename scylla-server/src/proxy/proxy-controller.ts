import { Socket } from 'socket.io';

/**
 * Proxy Controller To Handle Inputting and Outputting Messages to a Client
 */
export default class ProxyController {
  messageMap: Map<string, (data: JSON) => void>;
  socket: Socket;

  /**
   * Constructor
   * @param messageMap A map of input arguments to functions that handle the input
   * @param socket the socket to send and receive messages from
   */
  constructor(messageMap: Map<string, (data: JSON) => void>, socket: Socket) {
    this.messageMap = messageMap;
    this.socket = socket;
  }

  /**
   * Handles a message from the client
   * @param data The data received from the client
   */
  private handleClientMessage = (data: any): void => {
    try {
      data = JSON.parse(data);
      const responseFunction = this.messageMap.get(data.argument);
      if (responseFunction) {
        const responseData = responseFunction(data);
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
   * Handles a client disconnect
   */
  private handleClientDisconnect = (): void => {
    console.log('disconnected from client');
  };

  /**
   * Handles a client connection
   */
  private handleClientConnection = (): void => {
    console.log('connected to client');
    this.socket.on('message', this.handleClientMessage);
    this.socket.on('disconnect', this.handleClientDisconnect);
  };

  /**
   * Configures the proxy controller
   */
  public configure = (): void => {
    this.handleClientConnection();
  };
}
