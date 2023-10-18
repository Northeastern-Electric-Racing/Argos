import { Router } from 'express';
import DataTypeController from '../controllers/datatype.controller';

const dataTypeRouter = Router();

dataTypeRouter.get('/', DataTypeController.getAllDataTypes);

export default dataTypeRouter;
