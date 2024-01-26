import { environment } from 'src/environment/environment';

const baseURL = environment.url;

/* Nodes */
const getAllNodes = () => `${baseURL}/nodes`;

/* Systems */
const getAllSystems = () => `${baseURL}/systems`;

/* Data */
const getDataByDataTypeName = (dataTypeName: string) => `${baseURL}/data/${dataTypeName}`;

/* Runs */
const getRunById = (id: number) => `${baseURL}/runs/${id}`;
const getAllRuns = () => `${baseURL}/runs`;

export const urls = {
  getAllNodes,

  getAllSystems,

  getDataByDataTypeName,

  getAllRuns,
  getRunById
};
