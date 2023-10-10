import { Request, Response } from 'express';
import RunService from '../services/runs.services';

/**
 * Controller to manage Run requests and responses
 */
export default class RunController {
  static async getAllRuns(req: Request, res: Response) {
    const allRuns = await RunService.getAllRuns();
    res.status(200).json(allRuns);
  }
}
