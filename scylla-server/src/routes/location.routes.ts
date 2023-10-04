import { Router } from 'express';
import LocationController from '../controllers/location.controller';

const nodeRouter = Router();

nodeRouter.get('/locations', LocationController.getAllLocations);

export default nodeRouter;
