// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorWithReasonCode, IConnackPacket, MqttClient } from 'mqtt/*';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';
import NodeService from '../services/nodes.services';
import RunService from '../services/runs.services';
import DataService from '../services/data.services';

/**
 * Handler for receiving messages from Siren
 */
export default class ProxyClient {
  connection: MqttClient;
  //should a new run be created, based off if new connection & data received
  createNewRun: boolean;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient) {
    this.connection = mqttClient;
    // only true first time after connected and data received
    this.createNewRun = false;
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
    this.createNewRun = false;
    console.log('Disconnected from Siren');
  };

  /**
   * Handles connecting to Siren
   * @param packet The packet sent when the connection is opened
   */
  private handleOpen = (packet: IConnackPacket) => {
    console.log('Connected to Siren', packet.properties);
    this.createNewRun = true;
    this.subscribeToTopics(Object.values(Topic));
  };

  /**
   * Handles messages received from Siren
   * Parses as ServerMessage, otherwise throws error
   * Passes data to handleData
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
  private handleData = async (data: ServerMessage) => {
    // if first time data recieved since connecting to car
    // then upsert new run
    console.log('Received Data: ', data);
    if (this.createNewRun) {
      // what would runID and runLocation be here?
      // use getallRuns to determine next ID?
      // await upsertRun(runID, runLocation);
    }
    this.createNewRun = false;
    await NodeService.upsertNode(data.node);
    // looping through data and upserting
    for (const serverdata of data.data) {
      // again, dataid and runid required to upsert
      // don't know where ids would come from
      // await upsertData(serverdata.id, serverdata.name, serverdata.value, data.unix_time, runid);
    }
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
