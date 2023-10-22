// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorWithReasonCode, IConnackPacket, MqttClient } from 'mqtt/*';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';
import { Run, DataType, Data } from '@prisma/client';
import NodeService from '../odyssey-base/src/services/nodes.services';
import RunService from '../odyssey-base/src/services/runs.services';
import DataService from '../odyssey-base/src/services/data.services';
import DataTypeService from '../odyssey-base/src/services/dataTypes.services';
import LocationService from '../odyssey-base/src/services/locations.services';
import DriverService from '../odyssey-base/src/services/driver.services';
import SystemService from '../odyssey-base/src/services/systems.services';

/**
 * Handler for receiving messages from Siren
 */
export default class ProxyClient {
  connection: MqttClient;
  // should a new run be created, based off if new connection & data received
  createNewRun: boolean;
  // storing run for the current connection, at start is undefined
  currentRun: Run | undefined;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient) {
    this.connection = mqttClient;
    // only true first time after connected and data received
    this.createNewRun = false;
    // haven't connected yet so no run yet
    this.currentRun = undefined;
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
  private handleMessage = (topic: string, payload: Buffer) => {
    // am i supposed to do something with topic
    console.log('Received Message: ', payload);
    try {
      const data = JSON.parse(payload.toString()) as ServerMessage;
      this.handleData(data);
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
  private handleData = async (data: ServerMessage) => {
    // if first time data recieved since connecting to car
    // then create new run
    console.log('Received Data: ', data);
    if (this.createNewRun) {
      this.currentRun = await RunService.createRun(data.unix_time);
    }
    this.createNewRun = false;
    // upsert the node
    const node = await NodeService.upsertNode(data.node);
    // looping through data and adding
    if (this.currentRun) {
      const dataTypesReceived: DataType[] = [];
      const dataReceived: Data[] = [];
      for (const serverdata of data.data) {
        const dataType = await DataTypeService.upsertDataType(serverdata.name, serverdata.units, node.name);
        dataTypesReceived.push(dataType);
        const dataAdded = await DataService.addData(serverdata, data.unix_time, serverdata.value, this.currentRun.id);
        dataReceived.push(dataAdded);
      }
      // upserting location, system, driver ( can be added to above loop but
      // not gonna do that rn because i still dont think this remotely right
      // cuz it doesnt make sense with the prisma schema )
      let latitude = 0;
      let longitude = 0;
      let radius = 0;
      const locationName = '';
      const driverUser = '';
      const systemName = '';
      let locCounter = 0;
      let drivCounter = 0;
      let systCounter = 0;

      for (const serverdata of data.data) {
        if (serverdata.name === 'driverUser') {
          // serverdata.value can only be integer, need string
          // driverUser = serverdata.value
          drivCounter += 1;
        }
        if (serverdata.name === 'systemName') {
          // serverdata.value can only be integer, need string
          // systemName = serverdata.value
          systCounter += 1;
        }
        if (serverdata.name === 'lattitude') {
          latitude = serverdata.value;
          locCounter += 1;
        }
        if (serverdata.name === 'longitude') {
          longitude = serverdata.value;
          locCounter += 1;
        }
        if (serverdata.name === 'radius') {
          radius = serverdata.value;
          locCounter += 1;
        }
        if (serverdata.name === 'locationName') {
          // serverdata.value can only be integer, need string
          // locationName = serverdata.value
          locCounter += 1;
        }
      }
      if (locCounter === 4) {
        const location = await LocationService.upsertLocation(locationName, latitude, longitude, radius, this.currentRun.id);
        locCounter = 0;
      }
      if (drivCounter === 1) {
        const driver = await DriverService.upsertDriver(driverUser, this.currentRun.id);
        drivCounter = 0;
      }
      if (systCounter === 1) {
        const system = await SystemService.upsertSystem(systemName, this.currentRun.id);
        locCounter = 0;
      }
      // then send everything to Proxy Server, so i guess keep log of
      // of everything?
      this.connection.publish('topic', dataReceived.toString());
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
