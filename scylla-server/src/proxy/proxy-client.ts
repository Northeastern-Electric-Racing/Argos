// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorEvent, Event, MessageEvent, WebSocket } from 'ws';
import { ServerMessage, SubscriptionMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';
import { upsertNode } from '../services/nodes.services';
import { upsertRun } from '../services/runs.services';
import { upsertData } from '../services/data.services';

/**
 * Handler for receiving messages from Siren
 */
export default class ProxyClient {
  socket: WebSocket;
  //should a new run be created, based off if new connection & data received
  createNewRun: boolean;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(socket: WebSocket) {
    this.socket = socket;
    // only true first time after connected and data received
    this.createNewRun = false;
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
    this.createNewRun = false;
    console.log('Disconnected from Siren', event);
  };

  /**
   * Handles connecting to Siren
   * @param event The event that triggered the open
   */
  private handleOpen = (event: Event) => {
    console.log('Connected to Siren', event);
    this.createNewRun = true;
    this.subscribeToTopics(Object.values(Topic));
  };

  /**
   * Handles messages received from Siren
   * Parses as ServerMessage, otherwise throws error
   * Passes data to handleData
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
    await upsertNode(data.node);
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
