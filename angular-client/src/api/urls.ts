import { environment } from 'src/environment/environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseURL = (environment as any).url || 'http://localhost:8000';

/* Datatypes */
const getAllDatatypes = () => `${baseURL}/datatypes`;

/* Systems */
const getAllSystems = () => `${baseURL}/systems`;

/* Data */
const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number) =>
  `${baseURL}/data/${dataTypeName.replaceAll('/', '%2F')}/${runId}`;

/* Runs */
const getRunById = (id: number) => `${baseURL}/runs/${id}`;
const getAllRuns = () => `${baseURL}/runs`;
const getLatestRun = () => `${baseURL}/runs/latest`;
const startNewRun = () => `${baseURL}/runs/new`;

export const urls = {
  getAllDatatypes,

  getAllSystems,

  getDataByDataTypeNameAndRunId,

  getAllRuns,
  getLatestRun,
  getRunById,
  startNewRun
};
