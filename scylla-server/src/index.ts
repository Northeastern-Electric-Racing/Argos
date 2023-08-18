import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
