const baseURL = 'http://localhost:8000';

/* Nodes */
const getAllNodes = () => `${baseURL}/nodes`;

/* Systems */
const getAllSystems = () => `${baseURL}/systems`;

/* Data */
const getDataByDataTypeName = (dataTypeName: string) => `${baseURL}/data/${dataTypeName}`;

export const urls = {
  getAllNodes,

  getAllSystems,

  getDataByDataTypeName
};
