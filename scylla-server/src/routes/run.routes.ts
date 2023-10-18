import { Router } from 'express';
import RunController from '../controllers/run.controller';

const runRouter = Router();

runRouter.get('/', RunController.getAllRuns);

export default runRouter;
