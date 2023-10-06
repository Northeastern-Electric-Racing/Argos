import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import ProxyServer from './proxy/proxy-server';
import ProxyClient from './proxy/proxy-client';
import nodeRouter from './routes/node.routes';
import cors from 'cors';
import locationRouter from './routes/location.routes';
import { connect } from 'mqtt';

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
const host = 'localhost';
const mqttPort = '8080';
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const connectUrl = `mqtt://${host}:${mqttPort}`;

const connection = connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: 'scylla-server',
  password: 'public',
  reconnectPeriod: 1000
});

const proxyClient = new ProxyClient(connection);
proxyClient.configure();
