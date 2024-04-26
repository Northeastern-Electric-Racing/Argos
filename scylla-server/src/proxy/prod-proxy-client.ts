import { ErrorWithReasonCode, IConnackPacket, IPublishPacket, MqttClient } from 'mqtt/*';
import { Topic } from '../odyssey-base/src/types/topic';
import { run } from '@prisma/client';
import NodeService from '../odyssey-base/src/services/nodes.services';
import RunService from '../odyssey-base/src/services/runs.services';
import DataTypeService from '../odyssey-base/src/services/dataTypes.services';
import LocationService from '../odyssey-base/src/services/locations.services';
import DriverService from '../odyssey-base/src/services/driver.services';
import SystemService from '../odyssey-base/src/services/systems.services';
import { ClientData } from '../utils/message.utils';
import { ServerMessage } from '../odyssey-base/src/types/message.types';
import { serverdata as ServerData } from '../odyssey-base/src/generated/serverdata/v1/serverdata';
import ProxyClient from './proxy-client';
import ProxyServer from './proxy-server';
import { DataType } from '../utils/data.utils';
import prisma from '../odyssey-base/src/prisma/prisma-client';

/**
 * Handler for receiving messages from Siren
 */
export default class ProdProxyClient implements ProxyClient {
  connection: MqttClient;
  createNewRun: boolean;
  // storing run for the current connection, at start is undefined
  currentRun: run | undefined;

  proxyServers: ProxyServer[];

  recentLatitude: number | undefined;
  recentLongitude: number | undefined;
  recentRadius: number | undefined;
  recentLocationName: string | undefined;
  newLocation: boolean = true;
  topicTimerMap: Map<string, number> = new Map();
  refreshRate: number = 0;
  batches: Map<string, ServerMessage[]> = new Map();
  upsertedNodes: Set<string> = new Set();
  upsertedDataTypes: Set<string> = new Set();
  lastBatchUpload: number = Date.now();
  batchUploadInterval: number = 10000;

  /**
   * Constructor
   * @param socket The socket to send and receive messages from
   */
  constructor(mqttClient: MqttClient) {
    this.connection = mqttClient;
    this.createNewRun = true;
    this.currentRun = undefined;
    this.proxyServers = [];
  }

  /**
   * Sends a subscription message to Siren
   * @param topics The topics to subscribe to
   */
  private subscribeToTopics(topics: Topic[]) {
    this.connection.subscribe(topics.map((topic) => topic.valueOf()));
  }

  /**
   * Handles disconnecting from Siren
   */
  private handleClose() {
    this.createNewRun = true;
    console.log('Disconnected from Siren');
  }

  /**
   * Handles connecting to Siren
   * @param packet The packet sent when the connection is opened
   */
  private async handleOpen(packet: IConnackPacket) {
    console.log('Connected to Siren', packet.properties);
    if (this.createNewRun) {
      this.createNewRun = false;
      const run = await RunService.createRun(Date.now());
      this.currentRun = run;
    }
    this.subscribeToTopics([Topic.ALL]);
  }

  /**
   * Handles messages received from Siren
   * Parses as ServerMessage, otherwise throws error
   * Passes data to handleData
   * @param topic The topic the message was received on
   * @param message The message received from Siren
   */
  private async handleMessage(topic: string, payload: Buffer, packet: IPublishPacket) {
    if (this.topicTimerMap.has(topic)) {
      if (Date.now() - this.topicTimerMap.get(topic)! < this.refreshRate) {
        return;
      }
    }

    this.topicTimerMap.set(topic, Date.now());
    try {
      if (Date.now() - this.lastBatchUpload > this.batchUploadInterval) {
        this.lastBatchUpload = Date.now();
        await this.batchesUpload(this.batches, this.currentRun!.id);
      }
      const data = ServerData.v1.ServerData.deserializeBinary(payload).toObject();
      /* Infer node name from topics first segment */
      const [node] = topic.split('/');
      /* Infer data type name from topic after node */
      const dataType = topic.split('/').slice(1).join('-');

      const unix_time = packet.properties?.userProperties ? packet.properties.userProperties['ts'] : undefined;

      if (!unix_time) {
        throw new Error('No ts property in packet');
      }

      if (parseInt(unix_time as string) < 956040526) {
        //2000
        throw new Error('timestamp is less than the year 2000');
      }

      if (data.unit !== undefined && data.values !== undefined && data.values.length > 0) {
        const serverMessage: ServerMessage = {
          node,
          dataType,
          unix_time: parseInt(unix_time as string),
          data: {
            values: data.values,
            unit: data.unit
          }
        };

        await this.handleData(serverMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log('Error Decoding Message: ', error.message);
        this.handleError(error);
      }
    }
  }

  /**
   * Handles receiving data from the car and:
   * 1. Logs the data
   * 2. Sends the data to the client
   * @param data The data received from Siren
   */
  private async handleData(data: ServerMessage) {
    // start upserting data
    if (!this.currentRun) {
      console.log('no current run');
      return;
    }

    // initializing params
    let driverName: string | undefined = undefined;
    let systemName: string | undefined = undefined;

    // iterating and upserting
    const serverdata = data.data;
    switch (data.dataType) {
      case DataType.Driver:
        [driverName] = serverdata.values;
        break;
      case DataType.System:
        [systemName] = serverdata.values;
        break;
      case DataType.Location:
        if (this.recentLocationName) {
          if (this.recentLocationName !== serverdata.values[0]) {
            this.newLocation = true;
          }
        } else {
          [this.recentLocationName] = serverdata.values;
          this.newLocation = true;
        }
        break;
      case DataType.Points:
        this.recentLatitude = parseFloat(serverdata.values[0]);
        this.recentLongitude = parseFloat(serverdata.values[1]);
        break;
      case DataType.Radius:
        this.recentRadius = parseFloat(serverdata.values[0]);
        break;
      default:
        this.batches.set(
          data.dataType,
          this.batches.get(data.dataType) ? this.batches.get(data.dataType)!.concat(data) : [data]
        );

        break;
    }

    // transform serverdata into client data to send to ProxyServer
    const clientData: ClientData = {
      runId: this.currentRun.id,
      name: data.dataType,
      values: serverdata.values,
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
  }

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
  public configure() {
    console.log('configuring');
    this.connection.on('message', this.handleMessage.bind(this));
    this.connection.on('connect', this.handleOpen.bind(this));
    this.connection.on('error', this.handleError.bind(this));
    this.connection.on('close', this.handleClose.bind(this));
  }

  public addProxyServer(proxyServer: ProxyServer) {
    this.proxyServers.push(proxyServer);
  }

  private async batchesUpload(batches: Map<string, ServerMessage[]>, runId: number) {
    for (const [key, value] of batches) {
      console.log('Uploading batch for key: ', key, ' with length: ', value.length);
      try {
        if (value.length === 0) {
          continue;
        }

        const [first] = value;

        if (!this.upsertedNodes.has(first.node)) {
          await NodeService.upsertNode(first.node);
          this.upsertedNodes.add(first.node);
        }

        if (!this.upsertedDataTypes.has(first.dataType)) {
          await DataTypeService.upsertDataType(first.dataType, first.data.unit, first.node);
          this.upsertedDataTypes.add(first.dataType);
        }

        await prisma.data.createMany({
          data: value.map((message) => {
            return {
              values: message.data.values.map(parseFloat),
              time: new Date(message.unix_time),
              dataTypeName: message.dataType,
              runId
            };
          })
        });

        console.log('Batch uploaded for key: ', key);

        batches.set(key, []);
      } catch (error) {
        console.log('Error uploading batch: ', error);
        batches.set(key, []);
      }
    }
  }

  /**
   * Removes a proxy server from the list of proxy servers
   * @param proxyServer The proxy server to remove
   */
  public removeProxyServer(proxyServer: ProxyServer) {
    this.proxyServers = this.proxyServers.filter((server) => server !== proxyServer);
  }
}
