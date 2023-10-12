import { NextFunction, Request, Response } from 'express';
import DriverService from '../odyssey-base/src/services/driver.services';

/**
 * Controller to manage Driver requests and responses.
 */
export default class DriverController {
  static async getAllDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const allDrivers = await DriverService.getAllDrivers();
      res.status(200).json(allDrivers);
    } catch (error: unknown) {
      next(error);
    }
  }
}
