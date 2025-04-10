import { environment } from 'src/environment/environment';
import { Timing } from 'src/utils/types.utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseURL = (environment as any).url || 'http://localhost:8000';

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

/* Videos */
const getAllVideos = () => `${baseURL}/videos`;
const getVideo = (fileName: string) => `${getAllVideos()}/${encodeURIComponent(fileName)}`;
const updateVideos = () => `${getAllVideos()}/update`;

export const urls = {
  getAllDatatypes,

  getAllSystems,

  getDataByDataTypeNameAndRunId,
  getDataByDataTypeNameAndTiming,

  getAllRuns,
  getLatestRun,
  getRunById,
  startNewRun,

  getAllVideos,
  getVideo,
  updateVideos
};
