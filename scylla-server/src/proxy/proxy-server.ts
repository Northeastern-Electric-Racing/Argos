import { Socket } from 'socket.io';
import { ClientMessage } from '../utils/message.utils';

/**
 * Proxy for handling Inputting and Outputting Messages to a Client
 */
export default class ProxyServer {
  socket: Socket;

  /**
   * Constructor
   * @param socket the socket to send and receive messages from
   */
  constructor(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Handles a disconnection
   */
  private handleDisconnect = (): void => {
    console.log('disconnected socket');
  };

  /**
   * Sends data to the client
   */
  public sendMessage = (message: ClientMessage) => {
    this.socket.emit('message', message);
  };

  /**
   * Handles a connection
   */
  private handleConnection = (): void => {
    console.log('connected socket');
    this.socket.on('disconnect', this.handleDisconnect);
  };

  /**
   * Configures the proxy controller
   */
  public configure = (): void => {
    this.handleConnection();
  };
}
