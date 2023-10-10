import { Request, Response } from 'express';
import DataService from '../odyssey-base/src/services/data.services';

/**
 * Controller to manage Data requests and responses
 */
export default class DataController {
  static async getDataByDataTypeName(req: Request, res: Response) {
    try {
      const dataByDataTypeName = await DataService.getDataByDataTypeName(req.body.dataTypeName);
      res.status(200).json(dataByDataTypeName);
    } catch (error: any) {
      res.status(error.status).send(error.message);
    }
  }
}
