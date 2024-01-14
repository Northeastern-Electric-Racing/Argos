import { NextFunction, Request, Response } from 'express';
import RunService from '../odyssey-base/src/services/runs.services';

/**
 * Controller to manage Run requests and responses
 */
export default class RunController {
  static async getAllRuns(_req: Request, res: Response, next: NextFunction) {
    try {
      const allRuns = await RunService.getAllRuns();
      res.status(200).json(allRuns);
    } catch (error: unknown) {
      next(error);
    }
  }

  static async getRunById(req: Request, res: Response, next: NextFunction) {
    try {
      const runId = parseInt(req.params.id);
      const run = await RunService.getRunById(runId);
      res.status(200).json(run);
    } catch (error: unknown) {
      next(error);
    }
  }
}
