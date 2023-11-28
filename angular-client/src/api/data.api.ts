import { urls } from './urls';

export const getDataByDataTypeName = async (dataTypeName: string) => {
  return await fetch(urls.getDataByDataTypeName(dataTypeName));
};
