import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
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

const proxyClient = new ProxyClient();
proxyClient.configure();
