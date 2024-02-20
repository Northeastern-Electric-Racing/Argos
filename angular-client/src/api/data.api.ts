import { urls } from './urls';

export const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number): Promise<Response> => {
  return fetch(urls.getDataByDataTypeNameAndRunId(dataTypeName, runId));
};
