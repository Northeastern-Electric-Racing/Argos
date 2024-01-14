// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorWithReasonCode, IConnackPacket, MqttClient } from 'mqtt/*';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { Topic } from '../odyssey-base/src/types/topic';
import { Run } from '@prisma/client';
import NodeService from '../odyssey-base/src/services/nodes.services';
import RunService from '../odyssey-base/src/services/runs.services';
import DataService from '../odyssey-base/src/services/data.services';
import DataTypeService from '../odyssey-base/src/services/dataTypes.services';
import LocationService from '../odyssey-base/src/services/locations.services';
import DriverService from '../odyssey-base/src/services/driver.services';
import SystemService from '../odyssey-base/src/services/systems.services';
import ProxyServer from './proxy-server';
import { ClientMessage, ClientData } from '../utils/message.utils';
/**
 * Handler for receiving messages from Siren
 */
export default class ProxyClient {
  connection: MqttClient;
  // should a new run be created, based off if new connection & data received
  createNewRun: boolean;
  // storing run for the current connection, at start is undefined
  currentRun: Run | undefined;

  proxyServer: ProxyServer;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient, proxyServer: ProxyServer) {
    this.connection = mqttClient;
    // only true first time after connected and data received
    this.createNewRun = false;
    // haven't connected yet so no run yet
    this.currentRun = undefined;

    this.proxyServer = proxyServer;
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
    this.subscribeToTopics([Topic.ALL]);
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
    if (this.createNewRun) {
      this.currentRun = await RunService.createRun(data.unix_time);
    }
    this.createNewRun = false;
    // upsert the node
    const node = await NodeService.upsertNode(data.node);
    // start upserting data
    if (!this.currentRun) {
      console.log('no current run');
      return;
    }
    // initializing params
    let latitude = undefined;
    let longitude = undefined;
    let radius = undefined;
    let locationName = undefined;
    let driverName = undefined;
    let systemName = undefined;

    // enum instead of raw string representing
    // driver, system, location props
    enum Property {
      driverUser = 'driverUser',
      systemName = 'systemName',
      locationName = 'locationName',
      latitude = 'latitude',
      longitude = 'longitude',
      radius = 'radius'
    }

    // iterating and upserting
    const clientData: ClientData[] = [];
    for (const serverdata of data.data) {
      switch (serverdata.name) {
        case Property.driverUser:
          driverName = serverdata.value as string;
          break;
        case Property.systemName:
          systemName = serverdata.value as string;
          break;
        case Property.locationName:
          locationName = serverdata.value as string;
          break;
        case Property.latitude:
          latitude = serverdata.value as number;
          await DataTypeService.upsertDataType(serverdata.name, serverdata.units, node.name);
          break;
        case Property.longitude:
          longitude = serverdata.value as number;
          await DataTypeService.upsertDataType(serverdata.name, serverdata.units, node.name);
          break;
        case Property.radius:
          radius = serverdata.value as number;
          break;
        default:
          await DataTypeService.upsertDataType(serverdata.name, serverdata.units, node.name);
          await DataService.addData(serverdata, data.unix_time, serverdata.value as number, this.currentRun.id);
      }

      // transform serverdata into client data to send to ProxyServer
      const clientdata: ClientData = {
        name: serverdata.name,
        value: serverdata.value,
        units: serverdata.units,
        timestamp: data.unix_time
      };
      clientData.push(clientdata);
    }

    if (systemName) {
      SystemService.upsertSystem(systemName, this.currentRun.id);
    }
    if (driverName) {
      DriverService.upsertDriver(driverName, this.currentRun.id);
    }
    if (latitude && longitude && radius && locationName) {
      LocationService.upsertLocation(locationName, latitude, longitude, radius, this.currentRun.id);
    }
    const clientMessage: ClientMessage = {
      data: clientData
    };
    this.proxyServer.sendMessage(clientMessage);
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
