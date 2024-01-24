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
    this.connection.subscribe(topics.map((topic) => topic.valueOf()));
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
    this.subscribeToTopics([Topic.ALL]);
  };

  /**
   * Handles messages received from Siren
   * @param topic The topic the message was received on
   * @param message The message received from Siren
   */
  private handleMessage = (topic: string, payload: Buffer, packet: IPublishPacket) => {
    try {
      const data = serverdata.v1.ServerData.deserializeBinary(payload).toObject();
      /* Infer node name from topics first segment */
      const [node] = topic.split('/');
      /* Infer data type name from topic after node */
      const dataType = topic.split('/').slice(1).join('-');

      const unix_time = packet.properties?.userProperties ? packet.properties.userProperties['unix_time'] : undefined;

      if (!unix_time) {
        throw new Error('No unix_time property in packet');
      }

      let value: string;
      let unit: string;

      if (data.value && data.unit) {
        ({ value } = data);
        ({ unit } = data);
      } else {
        return;
      }

      if (data.unit && data.value) {
        const serverMessage: ServerMessage = {
          node,
          dataType,
          unix_time: parseInt(unix_time as string),
          data: {
            value,
            unit
          }
        };

        this.handleData(serverMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error Decoding Message: ', error.message);
        this.handleError(error);
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
