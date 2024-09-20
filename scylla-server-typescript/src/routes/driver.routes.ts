import { Router } from 'express';
import DriverController from '../controllers/driver.controller';

const driverRouter = Router();

driverRouter.get('/', DriverController.getAllDrivers);

export default driverRouter;
