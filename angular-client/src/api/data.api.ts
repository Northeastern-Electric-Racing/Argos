import { Timing } from 'src/utils/types.utils';
import { urls } from './urls';

export const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number, timing?: Timing): Promise<Response> => {
  return fetch(urls.getDataByDataTypeNameAndRunId(dataTypeName, runId, timing));
};
