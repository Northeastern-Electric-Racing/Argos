import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { WebSocket } from 'ws';
import ProxyServer from './proxy/proxy-server';
import ProxyClient from './proxy/proxy-client';
import { createClientMessageMap } from './utils/message-maps.utils';

const app = express();
const port = 8000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express server with TypeScript!');
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const serverSocket = new Server(server, {
  cors: {
    origin: 'http://localhost:3000'
  }
});

serverSocket.on('connection', (socket: Socket) => {
  const serverProxy = new ProxyServer(createClientMessageMap(), socket);
  serverProxy.configure();
});

// TODO: Get host/port from DNC
const socketClient = new WebSocket('ws://localhost:8000');

const proxyClient = new ProxyClient(socketClient);
proxyClient.configure();

function canCompleteCircuit(gas: number[], cost: number[]): number {
    let maxStationIndex = 0
    let maxStationBalance = gas[0] - cost[0];
    let balance = 0;
    let totalBalance = maxStationBalance;
    let i = 1;
    while (i < gas.length) {
        balance = gas[i] - cost[i];
        totalBalance += balance;
        console.log(totalBalance)
        if (balance > maxStationBalance || totalBalance < 0) {
            maxStationIndex = i;
            maxStationBalance = balance;
        }
        i++;
    }
    if (totalBalance >= 0) {
        return maxStationIndex;
    }
    return -1;
};

console.log(canCompleteCircuit([3, 1, 1], [1, 2, 2]));