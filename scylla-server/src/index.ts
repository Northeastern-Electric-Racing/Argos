import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import ProxyController from './proxy/proxy-controller';

const app = express();
const port = 8000;
const prisma = new PrismaClient();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, Express server with TypeScript!');
});

app.get('/runs', async (req: Request, res: Response) => {
  try {
    const data = await prisma.run.findUnique({
      where: { id: 1 } // Modify the query as needed
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const serverSocket = new Server(server, {
  cors: {
    origin: 'http://localhost:3000'
  }
});

const serverProxyController = new ProxyController();

serverSocket.on('connection', serverProxyController.handleClientConnection);

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
