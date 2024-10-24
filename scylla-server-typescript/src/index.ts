import express, { NextFunction, Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import ProxyServer from './socket/proxy-server';
import ProdProxyClient from './socket/prod-proxy-client';
import MockProxyClient from './socket/mock-proxy-client';
import ProxyClient from './socket/proxy-client';
import cors from 'cors';
import { connect } from 'mqtt';
import locationRouter from './routes/location.routes';
import nodeRouter from './routes/node.routes';
import systemRouter from './routes/system.routes';
import runRouter from './routes/run.routes';
import dataRouter from './routes/data.routes';
import dataTypeRouter from './routes/datatype.routes';
import { NotFoundError } from './odyssey-base/src/utils/errors.utils';
import driverRouter from './routes/driver.routes';

const app = express();
const port = 8000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, Express server with TypeScript!');
});

app.use(cors());
app.use(express.json());
app.use('/nodes', nodeRouter);
app.use('/locations', locationRouter);
app.use('/systems', systemRouter);
app.use('/runs', runRouter);
app.use('/data', dataRouter);
app.use('/datatypes', dataTypeRouter);
app.use('/drivers', driverRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  const status = err instanceof NotFoundError ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  // Send the error response as a JSON object
  res.status(status).json({ status, message });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const serverSocket = new Server(server, {
  cors: {
    origin(requestOrigin, callback) {
      console.log(requestOrigin);
      callback(null, true);
    }
  }
});

let proxyClient: ProxyClient;

if (process.env.PROD === 'true') {
  const host = process.env.PROD_SIREN_HOST_URL;
  const mqttPort = '1883';
  const clientId = `Scylla-Server`;

  const connectUrl = `mqtt://${host}:${mqttPort}`;

  const connection = connect(connectUrl, {
    clientId,
    clean: true,
    protocolVersion: 5,
    connectTimeout: 4000,
    reconnectPeriod: 1000
  });

  console.log('Connecting to Siren...');

  proxyClient = new ProdProxyClient(connection);
} else {
  proxyClient = new MockProxyClient(1);
}

proxyClient.configure();

serverSocket.on('connection', (socket: Socket) => {
  const serverProxy = new ProxyServer(socket);

  serverProxy.configure();
  serverProxy.socket.on('disconnect', () => {
    proxyClient.removeProxyServer(serverProxy);
  });
  proxyClient.addProxyServer(serverProxy);
});
