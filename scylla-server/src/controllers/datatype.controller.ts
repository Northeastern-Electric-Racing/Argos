import { Request, Response } from 'express';
import DataTypeService from '../services/dataTypes.services';

/**
 * Controller to manage DataType requests and responses
 */
export default class DataTypeController {
  static async getAllDataTypes(req: Request, res: Response) {
    const allDataTypes = await DataTypeService.getAllDataTypes();
    res.status(200).json(allDataTypes);
  }
}
