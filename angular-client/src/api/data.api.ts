import { urls } from './urls';

export const getDataByDataTypeName = (dataTypeName: string): Promise<Response> => {
  return fetch(urls.getDataByDataTypeName(dataTypeName));
};
