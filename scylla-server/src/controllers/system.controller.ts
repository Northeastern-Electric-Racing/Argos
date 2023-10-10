import { Request, Response } from 'express';
import SystemService from '../odyssey-base/src/services/systems.services';

/**
 * Controller to manage System requests and responses
 */
export default class SystemController {
  static async getAllSystems(req: Request, res: Response) {
    try {
      const allSystems = await SystemService.getAllSystems();
      res.status(200).json(allSystems);
    } catch (error: any) {
      res.status(error.status).send(error.message);
    }
  }
}
