// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { ErrorWithReasonCode, IConnackPacket, IPublishPacket, MqttClient } from 'mqtt/*';
import { Topic } from '../odyssey-base/src/types/topic';
import { Run } from '@prisma/client';
import NodeService from '../odyssey-base/src/services/nodes.services';
import RunService from '../odyssey-base/src/services/runs.services';
import DataService from '../odyssey-base/src/services/data.services';
import DataTypeService from '../odyssey-base/src/services/dataTypes.services';
import LocationService from '../odyssey-base/src/services/locations.services';
import DriverService from '../odyssey-base/src/services/driver.services';
import SystemService from '../odyssey-base/src/services/systems.services';
import { ClientData } from '../utils/message.utils';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { serverdata as ServerData } from '../odyssey-base/src/generated/serverdata/v1/serverdata';
import ProxyClient from './proxy-client';
import ProxyServer from './proxy-server';

/**
 * Handler for receiving messages from Siren
 */
export default class ProdProxyClient implements ProxyClient {
  connection: MqttClient;
  createNewRun: boolean;
  // storing run for the current connection, at start is undefined
  currentRun: Run | undefined;

  proxyServers: ProxyServer[];

  recentLatitude: number | undefined;
  recentLongitude: number | undefined;
  recentRadius: number | undefined;
  recentLocationName: string | undefined;
  newLocation: boolean = true;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient) {
    this.connection = mqttClient;
    this.createNewRun = false;
    this.currentRun = undefined;
    this.proxyServers = [];
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
  private handleMessage = (topic: string, payload: Buffer, packet: IPublishPacket) => {
    try {
      const data = ServerData.v1.ServerData.deserializeBinary(payload).toObject();
      /* Infer node name from topics first segment */
      const [node] = topic.split('/');
      /* Infer data type name from topic after node */
      const dataType = topic.split('/').slice(1).join('-');

      const unix_time = packet.properties?.userProperties ? packet.properties.userProperties['unix_time'] : undefined;

      if (!unix_time) {
        throw new Error('No unix_time property in packet');
      }

      if (data.unit && data.values) {
        const serverMessage: ServerMessage = {
          node,
          dataType,
          unix_time: parseInt(unix_time as string),
          data: {
            //TODO: Correct this to use the correct server data edit the ServerMessage value to be an array of strings
            value: data.values,
            unit: data.unit
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
  private handleData = async (data: ServerMessage) => {
    // if first time data recieved since connecting to car
    // then create new run
    if (this.createNewRun) {
      this.currentRun = await RunService.createRun(data.unix_time);
      this.createNewRun = false;
    }
    // upsert the node
    const node = await NodeService.upsertNode(data.node);
    // start upserting data
    if (!this.currentRun) {
      console.log('no current run');
      return;
    }
    // initializing params
    let driverName: string[] | undefined = undefined;
    let systemName: string[] | undefined = undefined;

    // enum instead of raw string representing
    // driver, system, location props
    //TODO: Move this to a new file
    enum Property {
      driverUser = 'driverUser',
      systemName = 'systemName',
      locationName = 'locationName',
      latitude = 'latitude',
      longitude = 'longitude',
      radius = 'radius'
    }

    // iterating and upserting
    const serverdata = data.data;
    switch (data.dataType) {
      case Property.driverUser:
        driverName = serverdata.value as string[];
        break;
      case Property.systemName:
        systemName = serverdata.value as string[];
        break;
      case Property.locationName:
        if (this.recentLocationName) {
          if (this.recentLocationName !== serverdata.value) {
            this.newLocation = true;
          }
        } else {
          this.recentLocationName = serverdata.value as string;
          this.newLocation = true;
        }
        break;
      case Property.latitude:
        this.recentLatitude = serverdata.value as number;
        await DataTypeService.upsertDataType(data.dataType, serverdata.unit, node.name);
        break;
      case Property.longitude:
        this.recentLongitude = serverdata.value as number;
        await DataTypeService.upsertDataType(data.dataType, serverdata.unit, node.name);
        break;
      case Property.radius:
        this.recentRadius = serverdata.value as number;
        break;
      default:
        await DataTypeService.upsertDataType(data.dataType, serverdata.unit, node.name);
        //TODO: Correct this to use the correct server data
        await DataService.addData(new ServerData.v1.ServerData({}), data.unix_time, data.dataType, this.currentRun.id);
    }

    // transform serverdata into client data to send to ProxyServer
    const clientData: ClientData = {
      runId: this.currentRun.id,
      name: data.dataType,
      value: serverdata.value,
      unit: serverdata.unit,
      timestamp: data.unix_time
    };

    if (systemName) {
      await SystemService.upsertSystem(systemName, this.currentRun.id);
    }
    if (driverName) {
      await DriverService.upsertDriver(driverName, this.currentRun.id);
    }

    if (this.newLocation && this.recentLatitude && this.recentLongitude && this.recentRadius && this.recentLocationName) {
      await LocationService.upsertLocation(
        this.recentLocationName,
        this.recentLatitude,
        this.recentLongitude,
        this.recentRadius,
        this.currentRun.id
      );
      this.recentLatitude = undefined;
      this.recentLongitude = undefined;
      this.recentRadius = undefined;
      this.newLocation = false;
    }

    this.proxyServers.forEach((server) => server.sendMessage(clientData));
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

  public addProxyServer = (proxyServer: ProxyServer) => {
    this.proxyServers.push(proxyServer);
  };
}
