import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import WebSocket from 'ws';
import { Message } from "./utils/message.utils";
import { Server, Socket } from "socket.io";

const app = express();
const port = 8000;
const prisma = new PrismaClient();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Express server with TypeScript!");
});

app.get("/runs", async (req: Request, res: Response) => {
  try {
    const data = await prisma.run.findUnique({
      where: { id: 1 }, // Modify the query as needed
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/create", async (req: Request, res: Response) => {
  try {
    const data = await prisma.run.create({
      data: {
        name: "test",
      },
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error });
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

serverSocket.on('connection', (socket: Socket) => {
  console.log('connected to client');
  socket.on('disconnect', () => {
    console.log('disconnected from client');
  });
});


// const socketClient = new WebSocket('TODO: TALK TO Siren');

// socketClient.on('open', () => {
//   console.log('connected to Siren');
//   socketClient.on('message', (data: any) => {
//     try {
//       const message = JSON.parse(data) as Message;
//     } catch (error) {
//       console.log('error parsing message', error);
//     }
//   });
// });

// socketClient.on('close', () => {
//   console.log('disconnected from Siren');
// });
