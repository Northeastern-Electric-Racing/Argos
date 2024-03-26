import ProxyServer from './proxy-server';
import { ClientData } from '../utils/message.utils';
import { Unit } from '../odyssey-base/src/types/unit';
import { MockData, DataType } from '../utils/data.utils';
import ProxyClient from './proxy-client';

/**
 * base case for class constructor, somewhat arbitrary min/max values
 */
const baseMockData: MockData[] = [
  {
    name: DataType.PackTemp,
    unit: Unit.CELSIUS,
    vals: [0],
    min: -20,
    max: 54
  },

  {
    name: DataType.MotorTemp,
    unit: Unit.CELSIUS,
    vals: [0],
    min: -20,
    max: 54
  },

  {
    name: DataType.PackSOC,
    unit: Unit.PERCENT,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.Accel,
    unit: Unit.G,
    vals: [0, 0, 0],
    min: -6,
    max: 6
  },
  {
    name: DataType.Points,
    unit: Unit.COORD,
    vals: [0, 0],
    min: -90,
    max: 90
  },
  {
    name: DataType.SteeringAngle,
    unit: Unit.DEGREES,
    vals: [0],
    min: 0,
    max: 360
  }
];

/**
 * generates random ClientMessages
 */
export default class MockProxyClient implements ProxyClient {
  proxyServers: ProxyServer[];
  currentRunId: number;
  mockData: MockData[];

  constructor(runId: number = 1, mockData: MockData[] = baseMockData) {
    this.proxyServers = [];
    this.currentRunId = runId;
    this.mockData = mockData;
  }

  /**
   * generates a random index of an array given the size
   * @param length the length of an array
   *
   */
  private getRandomIndex = (length: number): number => {
    return Math.floor(Math.random() * length);
  };

  private eventLoopQueue = () => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve('loop');
      }, 1)
    );
  };

  //modified to now allow an array of data instead of a singular value
  public loop = async () => {
    let data: MockData;
    let index: number;

    while (true) {
      index = this.getRandomIndex(this.mockData.length);
      data = this.mockData[index];

      for (const val in data.vals) {
        if (data.vals.hasOwnProperty(val)) {
          let newVal = data.vals[val] + Math.random() * 2 - 1;
          newVal = Math.max(data.min, Math.min(data.max, newVal));
          data.vals[val] = newVal;
        }
      }

      const clientData: ClientData = {
        runId: this.currentRunId,
        name: data.name,
        unit: data.unit,
        values: data.vals.map((val) => val.toString()),
        timestamp: Date.now()
      };

      this.proxyServers.forEach((server) => server.sendMessage(clientData));
      await this.eventLoopQueue();
    }
  };

  /**
   * perpetually sends random data through socket(s) to client
   */
  public configure = (): void => {
    this.loop();
  };

  /**
   * adds a proxy server object
   * @param proxyServer
   */

  public addProxyServer = (proxyServer: ProxyServer) => {
    this.proxyServers.push(proxyServer);
  };
}
