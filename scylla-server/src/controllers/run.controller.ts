import { NextFunction, Request, Response } from 'express';
import RunService from '../odyssey-base/src/services/runs.services';

/**
 * Controller to manage Run requests and responses
 */
export default class RunController {
  static async getAllRuns(req: Request, res: Response, next: NextFunction) {
    try {
      const allRuns = await RunService.getAllRuns();
      res.status(200).json(allRuns);
    } catch (error: unknown) {
      next(error);
    }
  }
}
