import ProxyServer from './proxy-server';
import { ClientData } from '../utils/message.utils';
import { Unit } from '../odyssey-base/src/types/unit';

/**
 * Data definition to represent fake values
 * we want to pass to frontend
 */

type Parameter = {
    name: string,
    unit: string,
    min: number,
    max: number
}


/**
 * base case for class constructor, somewhat arbitrary min/max values
 */
const baseParameters = {
    "pack_temp" : {
        "name" : "Pack Temp",
        "unit" : Unit.CELSIUS,
        "min" : -20,
        "max" : 54
    },

    "motor_temp" : {
        "name" : "Motor Temp",
        "unit" : Unit.CELSIUS,
        "min" : -20,
        "max" : 54
    },

    "pack_soc" : {
        "name" : "Pack SOC",
        "unit" : Unit.PERCENT,
        "min" : 0,
        "max" : 100
    },

    "accel_x" : {
        "name" : "Accel X",
        "unit" : Unit.G,
        "min" : -6,
        "max" : 6
    },

    "accel_y" : {
        "name" : "Accel Y",
        "unit" : Unit.G,
        "min" : -6,
        "max" : 6
    },

    "accel_z" : {
        "name" : "Accel Z",
        "unit" : Unit.G,
        "min" : -6,
        "max" : 6
    },

};

/**
 * generates random ClientMessages
 */
export default class ProxyClientMock {
    proxyServers: ProxyServer[];
    currentRunID: number;

    //holds the possible data to be sent through socket(s)
    mockParameters: {[DataType: string]: Parameter};

    /**
     * 
     * @param runID the ID of the run, if specified
     * @param servers the sockets through which the messages will be sent
     * @param mockParameters information used to generate random messages
     */

    constructor(runID: number = 1, servers: ProxyServer[], mockParameters: {[DataType: string]: Parameter} = baseParameters){
        this.proxyServers = servers;
        this.currentRunID = runID;
        this.mockParameters = mockParameters;
    
    
        
        
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

    /**
     * perpetually sends random data through socket(s) to client
     */
    private messageLoop = () : void => {

        let keys : string[] = []
        let dataType : String;

        //get keys in list then randomize
        for (let key in this.mockParameters) {
            keys.push(key)
        }
        while (true) {
            dataType = keys[this.getRandomIndex(keys.length)]

            let clientData : ClientData = {
                runId: this.currentRunID,
                name: this.mockParameters.dataType.name,
                unit: this.mockParameters.dataType.unit,
                value: this.getRandomNum(this.mockParameters.dataType.min, this.mockParameters.dataType.max),
                timestamp: Date.now()
            }
            this.proxyServers.forEach((server) => server.sendMessage(clientData));
        }
    }

    
}