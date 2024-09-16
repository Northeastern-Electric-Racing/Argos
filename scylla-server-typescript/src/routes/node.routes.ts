import { Router } from 'express';
import NodeController from '../controllers/node.controller';

const nodeRouter = Router();

nodeRouter.get('/', NodeController.getAllNodes);

export default nodeRouter;
