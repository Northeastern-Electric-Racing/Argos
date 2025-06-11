import { Timing } from 'src/utils/types.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseURL = (window as any).__env?.BACKEND_URL;

/* Datatypes */
const getAllDatatypes = () => `${baseURL}/datatypes`;

/* Systems */
const getAllSystems = () => `${baseURL}/systems`;

/* Data */
const getDataByDataTypeNameAndRunId = (dataTypeName: string, runId: number) =>
  `${baseURL}/data/${encodeURIComponent(dataTypeName)}/${runId}`;

const getDataByDataTypeNameAndTiming = (dataTypeName: string, timing: Timing) =>
  `${baseURL}/data/${encodeURIComponent(dataTypeName)}?time=${timing.time}&before=${timing.before}&after=${timing.after}`;

/* Runs */
const getRunById = (id: number) => `${baseURL}/runs/${id}`;
const getAllRuns = () => `${baseURL}/runs`;
const getLatestRun = () => `${baseURL}/runs/latest`;
const startNewRun = () => `${baseURL}/runs/new`;
const startNewRunWithData = (driver: string, location: string, notes: string) =>
  `${baseURL}/runs/new/${driver}/${location}/${notes}`;
const updateRun = (id: number, driver: string, location: string, notes: string) =>
  `${baseURL}/runs/update/${id}/${driver}/${location}/${notes}`;

/* Videos */
const getAllVideos = () => `${baseURL}/videos`;
const getVideo = (fileName: string) => `${getAllVideos()}/${encodeURIComponent(fileName)}`;
const updateVideos = () => `${getAllVideos()}/update`;

/* Car Commands */
const carCommandConfig = (key: string, values: number[]) =>
  `${baseURL}/config/set/${key}?${values.map((value) => `data=${value}`).join('&')}`;

/* Authentication */
const authenticate = () => `${baseURL}/authenticate`;

export const urls = {
  getAllDatatypes,

  getAllSystems,

  getDataByDataTypeNameAndRunId,
  getDataByDataTypeNameAndTiming,

  getAllRuns,
  getLatestRun,
  getRunById,
  startNewRun,
  startNewRunWithData,
  updateRun,

  getAllVideos,
  getVideo,
  updateVideos,

  carCommandConfig,
  authenticate
};
