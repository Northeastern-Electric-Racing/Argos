import { NextFunction, Request, Response } from 'express';
import DataService from '../odyssey-base/src/services/data.services';

/**
 * Controller to manage Data requests and responses.
 */
export default class DataController {
  static async getDataByDataTypeNameAndRunId(req: Request, res: Response, next: NextFunction) {
    try {
      const { dataTypeName } = req.params;
      const { runId } = req.params;
      const getDataByDataTypeNameAndRunId = await DataService.getDataByDataTypeNameAndRunId(dataTypeName, +runId);
      res.status(200).json(getDataByDataTypeNameAndRunId);
    } catch (error: unknown) {
      next(error);
    }
  }
}
