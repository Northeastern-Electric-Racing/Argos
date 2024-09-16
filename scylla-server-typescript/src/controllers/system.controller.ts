import { NextFunction, Request, Response } from 'express';
import SystemService from '../odyssey-base/src/services/systems.services';

/**
 * Controller to manage System requests and responses
 */
export default class SystemController {
  static async getAllSystems(req: Request, res: Response, next: NextFunction) {
    try {
      const allSystems = await SystemService.getAllSystems();
      res.status(200).json(allSystems);
    } catch (error: unknown) {
      next(error);
    }
  }
}
