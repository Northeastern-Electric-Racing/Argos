import ProxyServer from './proxy-server';
import { ClientData } from '../utils/message.utils';
import { Unit } from '../odyssey-base/src/types/unit';
import ProxyClient from './proxy-client';
import { MockData, DataType } from '../utils/data.utils';



/**
 * base case for class constructor, somewhat arbitrary min/max values
 */
const baseMockData = [
    {
        "name" : DataType.PackTemp,
        "unit" : Unit.CELSIUS,
        "val" : 0,
        "min" : -20,
        "max" : 54
    },

    {
        "name" : DataType.MotorTemp,
        "unit" : Unit.CELSIUS,
        "val" : 0,
        "min" : -20,
        "max" : 54
    },

    {
        "name" : DataType.PackSOC,
        "unit" : Unit.PERCENT,
        "val" : 0,
        "min" : 0,
        "max" : 100
    },

    {
        "name" : DataType.AccelX,
        "unit" : Unit.G,
        "val" : 0,
        "min" : -6,
        "max" : 6
    },

    {
        "name" : DataType.AccelY,
        "unit" : Unit.G,
        "val" : 0,
        "min" : -6,
        "max" : 6
    },

    {
        "name" : DataType.AccelZ,
        "unit" : Unit.G,
        "val" : 0,
        "min" : -6,
        "max" : 6
    },

];

/**
 * generates random ClientMessages
 */
export default class MockProxyClient implements ProxyClient {
    proxyServers: ProxyServer[];
    currentRunId: number;
    mockData: MockData[]
    

    
    constructor(runId: number = 1,  mockData: MockData[] = baseMockData){
        this.proxyServers = [];
        this.currentRunId = runId;
        this.mockData = mockData;
        
        

        
    }

    /**
     * 
     * gets a random number between an inclusive range
     * @param min mimimum value in range for random number generation
     * @param max maximum value in range for random number generation
     *  
     */
    private getRandomNum = (min: number, max: number) : number => {
        return Math.random() * (max - min) + min;
    }

    /**
     * generates a random index of an array given the size
     * @param length the length of an array
     * 
     */
    private getRandomIndex = (length: number) : number => {
        return Math.floor(Math.random() * length);
    }

    //makes an empty promise to prevent blocking
    //from while loop
    private eventLoopQueue = ()  => {
        return new Promise(resolve => 
          setImmediate(() => {
            console.log('event loop');
            resolve("loop");
          })
        );
    }

    //enters a non-blocking while loop to send data
    public loop = async () => {
        let data : MockData;
        let delta : number;
        let newVal : number;
        let clientData : ClientData;
        let random : number;
        let index : number;
        

        while (true) {
            index = this.getRandomIndex(this.mockData.length);
            data = this.mockData[index];

            random = Math.random()
            if (random > 0.66) {
                delta = 1
            } else if(random > 0.33){
                delta = -1;
            } else {
                delta = 0;
            }

            newVal = data.val + delta;

            //makes sure new value for datatype is in range
            if (newVal > data.max) {
                newVal = data.max;
            } else if(newVal < data.min) {
                newVal = data.min;
            } 
            
            //update value held in object field
            this.mockData[index].val = newVal;

            clientData = {
                runId: this.currentRunId,
                name: data.name,
                unit: data.unit,
                value: newVal,
                timestamp: Date.now()
            }

            

            
            this.proxyServers.forEach((server) => server.sendMessage(clientData));
            await this.eventLoopQueue();
        }

    }

    /**
     * perpetually sends random data through socket(s) to client
     */
    public configure = () : void => {
        this.loop().then(() => console.log("done"));
        
    }

    /**
     * adds a proxy server object
     * @param proxyServer 
     */

    public addProxyServer = (proxyServer: ProxyServer) => {
        this.proxyServers.push(proxyServer);
    };

    
}