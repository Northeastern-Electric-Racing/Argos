import ProxyServer from './proxy-server';
import { ClientData, ClientMessage } from '../utils/message.utils';
import { Unit } from '../odyssey-base/src/types/unit';

/**
 * Data definition to represent fake values
 * we want to pass to frontend
 */

type MockData = {
    name: string,
    unit: string,
    min: number,
    max: number
}

//make dictionary for values for every parameter

/**
 * base case for class constructor, somewhat arbitrary min/max values
 */
export const baseParameters = {
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
    mockData: {[DataType: string]: MockData};
    prevValues: {[Name: string] : number};
    dataTypes: string[];

    
    constructor(runID: number = 1, servers: ProxyServer[], mockData: {[dataType: string]: MockData} = baseParameters){
        this.proxyServers = servers;
        this.currentRunID = runID;
        this.mockData = mockData;
        this.dataTypes = [];
        this.prevValues = {};
        

        //initializes a list of the dataType names and a dictionary
        //to store their previous values
        for (let key in this.mockData) {
            
            this.dataTypes.push(key)
            this.prevValues[key] = this.getRandomNum(this.mockData[key].min, this.mockData[key].max );
        }
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
    public messageLoop = () : void => {
        
        let dataType : string;
        let delta : number;
        let newVal : number;
        let clientData : ClientData;
        let clientMessage : ClientMessage;

        while (true) {
            dataType = this.dataTypes[this.getRandomIndex(this.dataTypes.length)];

            if (Math.random() > 0.5) {
                delta = 1
            } else {
                delta = -1;
            }

            newVal = this.prevValues[dataType] + delta;

            //makes sure new value for datatype is in range
            if (newVal > this.mockData[dataType].max) {
                newVal = this.mockData[dataType].max;
            } else if(newVal < this.mockData[dataType].min) {
                newVal = this.mockData[dataType].min;
            } 

            this.prevValues[dataType] = newVal;

            clientData = {
                runId: this.currentRunID,
                name: this.mockData[dataType].name,
                unit: this.mockData[dataType].unit,
                value: newVal,
                timestamp: Date.now()
            }

            

            console.log(clientData);
            console.log(this.proxyServers)
            this.proxyServers.forEach((server) => server.sendMessage(clientData));
        }
    }

    /**
     * adds a proxy server to object
     * @param proxyServer 
     */

    public addProxyServer = (proxyServer: ProxyServer) => {
        this.proxyServers.push(proxyServer);
    };

    
}