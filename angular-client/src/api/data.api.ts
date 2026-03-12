import { Timing } from 'src/utils/types.utils';
import { urls } from './urls';

export const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number): Promise<Response> => {
  return fetch(urls.getDataByDataTypeNameAndRunId(dataTypeName, runId));
};

export const getDataByDatatTypeNameAndTiming = (dataTypeName: string, timing: Timing): Promise<Response> => {
  return fetch(urls.getDataByDataTypeNameAndTiming(dataTypeName, timing));
};
