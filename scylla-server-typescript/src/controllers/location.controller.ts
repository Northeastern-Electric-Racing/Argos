import { NextFunction, Request, Response } from 'express';
import LocationService from '../odyssey-base/src/services/locations.services';

/**
 * Controller to manage Node requests and responses
 */
export default class LocationController {
  static async getAllLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const allLocations = await LocationService.getAllLocations();
      res.status(200).json(allLocations);
    } catch (error: unknown) {
      next(error);
    }
  }
}
