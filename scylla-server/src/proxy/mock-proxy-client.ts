import ProxyServer from './proxy-server';
import { ClientData } from '../utils/message.utils';
import { Unit } from '../odyssey-base/src/types/unit';
import { MockData, DataType, MockStringData } from '../utils/data.utils';
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
  },
  {
    name: DataType.Voltage,
    unit: Unit.VOLTS,
    vals: [0],
    min: 0,
    max: 5
  },
  {
    name: DataType.CPUUsage,
    unit: Unit.PERCENT,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.CPUTemp,
    unit: Unit.CELSIUS,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.RAMUsage,
    unit: Unit.PERCENT,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.WIFIRSSI,
    unit: Unit.DBM,
    vals: [0],
    min: 0,
    max: 5
  },
  {
    name: DataType.MCS,
    unit: Unit.PERCENT,
    vals: [0],
    min: 0,
    max: 100
  }
];

/**
 * base case for class constructor, somewhat arbitrary string values
 */
const baseStringData: MockStringData[] = [
  {
    name: DataType.Driver,
    units: Unit.STRING,
    vals: ['Fergus']
  },

  {
    name: DataType.Driver,
    units: Unit.STRING,
    vals: ['Max']
  }
];

/**
 * generates random ClientMessages
 */
export default class MockProxyClient implements ProxyClient {
  proxyServers: ProxyServer[];
  currentRunId: number;
  mockData: MockData[];
  mockStringData: MockStringData[];

  constructor(runId: number = 1, mockData: MockData[] = baseMockData, mockStringData: MockStringData[] = baseStringData) {
    this.proxyServers = [];
    this.currentRunId = runId;
    this.mockData = mockData;
    this.mockStringData = mockStringData;
  }

  fakeStringData = ['Batman', 'Kenobi', 'Jar-jar Binks'];

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
    let numericalData: MockData;
    let stringData: MockStringData;
    let index: number;
    let index2: number;
    let index3: number;

    while (true) {
      const randomNumber = parseInt((Math.random() * 10).toFixed(0)) % 2;

      if (randomNumber === 0) {
        index = this.getRandomIndex(this.mockData.length);
        numericalData = this.mockData[index];

        for (const val in numericalData.vals) {
          if (numericalData.vals.hasOwnProperty(val)) {
            let newVal = numericalData.vals[val] + Math.random() * 2 - 1;
            newVal = Math.max(numericalData.min, Math.min(numericalData.max, newVal));
            numericalData.vals[val] = newVal;
          }
        }

        const clientData: ClientData = {
          runId: this.currentRunId,
          name: numericalData.name,
          unit: numericalData.unit,
          values: numericalData.vals.map((val) => val.toString()),
          timestamp: Date.now()
        };

        this.proxyServers.forEach((server) => server.sendMessage(clientData));
        await this.eventLoopQueue();
      } else {
        index2 = this.getRandomIndex(this.mockStringData.length);
        stringData = this.mockStringData[index2];
        index3 = this.getRandomIndex(this.fakeStringData.length);
        stringData.vals[0] = this.fakeStringData[index3];

        const clientData: ClientData = {
          runId: this.currentRunId,
          name: stringData.name,
          unit: stringData.units,
          values: stringData.vals,
          timestamp: Date.now()
        };
        this.proxyServers.forEach((server) => server.sendMessage(clientData));
        await this.eventLoopQueue();
      }
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
