import { Router } from 'express';
import LocationController from '../controllers/location.controller';

const locationRouter = Router();

locationRouter.get('/', LocationController.getAllLocations);

export default locationRouter;
