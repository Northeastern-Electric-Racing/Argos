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
    name: DataType.PACK_TEMP,
    unit: Unit.CELSIUS,
    vals: [0],
    min: -20,
    max: 54
  },

  {
    name: DataType.MOTOR_TEMP,
    unit: Unit.CELSIUS,
    vals: [0],
    min: -20,
    max: 54
  },

  {
    name: DataType.STATE_OF_CHARGE,
    unit: Unit.PERCENT,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.STATUS_BALANCING,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.XYZAccel,
    unit: Unit.G,
    vals: [0, 0, 0],
    min: -6,
    max: 6
  },

  {
    name: DataType.POINTS,
    unit: Unit.COORD,
    vals: [0, 0],
    min: -90,
    max: 90
  },
  {
    name: DataType.STEERING_ANGLE,
    unit: Unit.DEGREES,
    vals: [0],
    min: 0,
    max: 360
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
  },
  {
    name: DataType.ACCELERATION,
    unit: Unit.METERS_PER_SECOND_SQUARED,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.CHARGE_CURRENT_LIMIT,
    unit: Unit.AMPERAGE,
    vals: [0],
    min: 0,
    max: 300
  },
  {
    name: DataType.DISCHARGE_CURRENT_LIMIT,
    unit: Unit.AMPERAGE,
    vals: [0],
    min: 0,
    max: 300
  },
  {
    name: DataType.BRAKE_PRESSURE,
    unit: Unit.PSI,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.TORQUE,
    unit: Unit.NEWTON_METERS,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.SPEED,
    unit: Unit.METERS_PER_SECOND,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.CURRENT,
    unit: Unit.AMPERAGE,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.BMS_MODE,
    unit: Unit.STRING,
    vals: [0],
    min: 1,
    max: 3
  },
  {
    name: DataType.VOLTS_HIGH,
    unit: Unit.VOLTS,
    vals: [0],
    min: 0,
    max: 5
  },
  {
    name: DataType.VOLTS_LOW,
    unit: Unit.VOLTS,
    vals: [0],
    min: 0,
    max: 5
  },
  {
    name: DataType.PACK_VOLTAGE,
    unit: Unit.VOLTS,
    vals: [0],
    min: 0,
    max: 5
  },
  {
    name: DataType.CELL_TEMP_HIGH,
    unit: Unit.CELSIUS,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.CELL_TEMP_AVG,
    unit: Unit.CELSIUS,
    vals: [0],
    min: 0,
    max: 100
  },
  {
    name: DataType.COMM_TIMEOUT_FAULT,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.HARDWARE_FAILURE_FAULT,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.OVER_TEMP_FAULT,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.VOLTAGE_WRONG_FAULT,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.WRONG_BAT_CONNECT_FAULT,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.CHARGING,
    unit: Unit.BINARY,
    vals: [0],
    min: 0,
    max: 1
  },
  {
    name: DataType.BMS_FAULTS,
    unit: Unit.HEX,
    vals: [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072],
    min: 0,
    max: 131072
  }
];

/**
 * base case for class constructor, somewhat arbitrary string values
 */
const baseStringData: MockStringData[] = [
  {
    name: DataType.DRIVER,
    units: Unit.STRING,
    vals: ['Fergus']
  },

  {
    name: DataType.LOCATION,
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

  fakeStringData = ['Fergus'];

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

        // IF MORE THAN ONE VALUE IS GIVEN in the numerical data, it is assumed that only those values should be choosen from.
        if (numericalData.vals.length > 1) {
          numericalData.vals[0] = numericalData.vals[this.getRandomIndex(numericalData.vals.length)];
        } else {
          for (const val in numericalData.vals) {
            if (numericalData.vals.hasOwnProperty(val)) {
              let newVal = numericalData.vals[val] + Math.random() * 2 - 1;
              newVal = Math.max(numericalData.min, Math.min(numericalData.max, newVal));
              numericalData.vals[val] = newVal;
            }
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

  /**
   * removes a proxy server object
   * @param proxyServer
   */
  public removeProxyServer = (proxyServer: ProxyServer) => {
    this.proxyServers = this.proxyServers.filter((server) => server !== proxyServer);
  };
}
