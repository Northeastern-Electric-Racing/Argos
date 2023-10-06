import { Request, Response } from 'express';
import LocationService from '../services/locations.services';

/**
 * Controller to manage Node requests and responses
 */
export default class LocationController {
  static async getAllLocations(req: Request, res: Response) {
    const allLocations = await LocationService.getAllLocations();
    res.status(200).json(allLocations);
  }
}
