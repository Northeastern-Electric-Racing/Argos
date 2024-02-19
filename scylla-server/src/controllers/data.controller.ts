import { NextFunction, Request, Response } from 'express';
import DataService from '../odyssey-base/src/services/data.services';

/**
 * Controller to manage Data requests and responses.
 */
export default class DataController {
  static async getDataByDataTypeNameAndRunId(req: Request, res: Response, next: NextFunction) {
    try {
      const { dataTypeName, runId } = req.params;
      const dataByDataTypeName = await DataService.getDataByDataTypeNameAndRunId(dataTypeName, parseInt(runId));
      res.status(200).json(dataByDataTypeName);
    } catch (error: unknown) {
      next(error);
    }
  }
}
