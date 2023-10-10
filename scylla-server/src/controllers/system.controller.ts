import { Request, Response } from 'express';
import SystemService from '../services/systems.services';

/**
 * Controller to manage System requests and responses
 */
export default class SystemController {
  static async getAllSystems(req: Request, res: Response) {
    const allSystems = await SystemService.getAllSystems();
    res.status(200).json(allSystems);
  }
}
