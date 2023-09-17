import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import { createServerMessageMap } from './utils/message-maps.utils';
import { WebSocket } from 'ws';
import ProxyServer from './proxy/proxy-server';
import ProxyClient from './proxy/proxy-client';

const app = express();
const port = 8000;

app.get('/', (req: Request, res: Response) => {
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
  const serverProxy = new ProxyServer(createServerMessageMap(), socket);
  serverProxy.configure();
});

// TODO: Get host/port from DNC
const socketClient = new WebSocket('ws://localhost:8000');

const proxyClient = new ProxyClient(socketClient);
proxyClient.configure();
