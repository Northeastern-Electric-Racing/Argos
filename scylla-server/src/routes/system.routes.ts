import { Router } from 'express';
import SystemController from '../controllers/system.controller';

const systemRouter = Router();

systemRouter.get('/', SystemController.getAllSystems);

export default systemRouter;
