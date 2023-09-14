import express, { Request, Response } from 'express';
import prisma from './prisma/prisma-client';

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
});
