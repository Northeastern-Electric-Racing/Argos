import { Router } from 'express';
import DataController from '../controllers/data.controller';

const dataRouter = Router();

dataRouter.get('/', DataController.getDataByDataTypeName);

export default dataRouter;
