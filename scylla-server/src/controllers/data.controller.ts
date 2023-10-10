import { Request, Response } from 'express';
import DataService from '../services/data.services';

/**
 * Controller to manage Data requests and responses
 */
export default class DataController {
  static async getDataByDataTypeName(req: Request, res: Response) {
    // get DataTypeName from req body
    const dataByDataTypeName = await DataService.getDataByDataTypeName(req.body.dataTypeName);
    res.status(200).json(dataByDataTypeName);
  }
}
