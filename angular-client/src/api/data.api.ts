import { urls } from './urls';

export const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number): Promise<Response> => {
  return fetch(urls.getDataByDataTypeNameAndRunId(dataTypeName, runId));
};

export const getDataByDatetime = (dateTime: string): Promise<Response> => {
  return fetch(urls.getDataByDatetime(dateTime));
};
