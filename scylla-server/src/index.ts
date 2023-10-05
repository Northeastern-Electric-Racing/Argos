import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
// Ignoring this because it wont build on github for some reason
// @ts-ignore
import { WebSocket } from 'ws';
import ProxyServer from './proxy/proxy-server';
import ProxyClient from './proxy/proxy-client';
import nodeRouter from './routes/node.routes';
import cors from 'cors';
import locationRouter from './routes/location.routes';

const app = express();
const port = 8000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express server with TypeScript!');
});

app.use(cors());

app.use('/nodes', nodeRouter);
app.use('/locations', locationRouter);

app.use(express.json());

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const serverSocket = new Server(server, {
  cors: {
    origin: 'http://localhost:4200'
  }
});

serverSocket.on('connection', (socket: Socket) => {
  const serverProxy = new ProxyServer(socket);
  serverProxy.configure();
});

// TODO: Get host/port from DNC
const socketClient = new WebSocket('ws://localhost:8000');

const proxyClient = new ProxyClient(socketClient);
proxyClient.configure();
