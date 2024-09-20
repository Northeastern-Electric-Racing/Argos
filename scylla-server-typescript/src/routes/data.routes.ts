import { Router } from 'express';
import DataController from '../controllers/data.controller';

const dataRouter = Router();

dataRouter.get('/:dataTypeName/:runId', DataController.getDataByDataTypeNameAndRunId);

export default dataRouter;
