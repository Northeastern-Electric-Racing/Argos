import { NextFunction, Request, Response } from 'express';
import DataService from '../odyssey-base/src/services/data.services';

/**
 * Controller to manage Data requests and responses.
 */
export default class DataController {
  static async getDataByDataTypeName(req: Request, res: Response, next: NextFunction) {
    try {
      const { dataTypeName } = req.params;
      const dataByDataTypeName = await DataService.getDataByDataTypeName(dataTypeName);
      res.status(200).json(dataByDataTypeName);
    } catch (error: unknown) {
      next(error);
    }
  }
}
