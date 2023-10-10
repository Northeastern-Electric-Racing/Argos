import { Request, Response } from 'express';
import DataTypeService from '../odyssey-base/src/services/dataTypes.services';

/**
 * Controller to manage DataType requests and responses
 */
export default class DataTypeController {
  static async getAllDataTypes(req: Request, res: Response) {
    try {
      const allDataTypes = await DataTypeService.getAllDataTypes();
      res.status(200).json(allDataTypes);
    } catch (error: any) {
      res.status(error.status).send(error.message);
    }
  }
}
