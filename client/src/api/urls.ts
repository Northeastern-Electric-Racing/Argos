import { environment } from 'src/environment/environment';

const baseURL = (environment as any).url || 'http://localhost:8000';

/* Nodes */
const getAllNodes = () => `${baseURL}/nodes`;

/* Systems */
const getAllSystems = () => `${baseURL}/systems`;

/* Data */
const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number) => `${baseURL}/data/${dataTypeName}/${runId}`;

/* Runs */
const getRunById = (id: number) => `${baseURL}/runs/${id}`;
const getAllRuns = () => `${baseURL}/runs`;
const startNewRun = () => `${baseURL}/runs/new`;

export const urls = {
  getAllNodes,

  getAllSystems,

  getDataByDataTypeNameAndRunId,

  getAllRuns,
  getRunById,
  startNewRun
};
