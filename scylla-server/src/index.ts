import express, { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import ProxyController from './proxy/proxy-controller';
import { createServerMessageMap } from './utils/message-maps.utils';

async function getAllDataTypes() {
  try {
    const dataTypes = await prisma.dataType.findMany();
    return dataTypes;
  } catch (error) {
    throw new Error('There was an error fetching data types.');
  }
}

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

const clientMessageMap = {
  allDataTypes: async () => {
    try {
      const dataTypes = await getAllDataTypes();
      return { success: true, data: dataTypes };
    } catch (error) {
      return { success: false, error: 'Error' };
    }
  }
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

serverSocket.on('connection', (socket: Socket) => {
  const serverProxy = new ProxyController(createServerMessageMap(), socket);
  serverProxy.configure();
});
}

//TODO: Get host/port from DNC
// const socketClient = new WebSocket('http://localhost:8080');

// socketClient.on('open', () => {
//   console.log('connected to Siren');
//   socketClient.on('message', (data: any) => {
//     try {
//       const message = JSON.parse(data) as Message;
//       console.log(message);
//     } catch (error) {
//       console.log('error parsing message', error);
//     }
//   });
// });

// socketClient.on('close', () => {
//   console.log('disconnected from Siren');
// });
