// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorWithReasonCode, IConnackPacket, MqttClient } from 'mqtt/*';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';

/**
 * Handler for receiving messages from Siren
 */
export default class ProxyClient {
  connection: MqttClient;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient) {
    this.connection = mqttClient;
  }

  /**
   * Sends a subscription message to Siren
   * @param topics The topics to subscribe to
   */
  private subscribeToTopics = (topics: Topic[]) => {
    this.connection.subscribe(topics.map((topic) => topic.toString()));
  };

  /**
   * Handles disconnecting from Siren
   */
  private handleClose = () => {
    console.log('Disconnected from Siren');
  };

  /**
   * Handles connecting to Siren
   * @param packet The packet sent when the connection is opened
   */
  private handleOpen = (packet: IConnackPacket) => {
    console.log('Connected to Siren', packet.properties);
    this.subscribeToTopics(Object.values(Topic));
  };

  /**
   * Handles messages received from Siren
   * @param topic The topic the message was received on
   * @param message The message received from Siren
   */
  private handleMessage = (topic: string, payload: Buffer) => {};

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
  private handleError = (error: Error | ErrorWithReasonCode) => {
    console.log('Error Encountered: ', error.message);
  };

  /**
   * Configures the proxy client for connecting and disconnecting to/from Siren,
   * sending and receiving messages, and handling errors
   */
  public configure = () => {
    this.connection.on('message', this.handleMessage);
    this.connection.on('connect', this.handleOpen);
    this.connection.on('error', this.handleError);
    this.connection.on('close', this.handleClose);
  };
}
