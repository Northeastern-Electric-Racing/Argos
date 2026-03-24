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

/* Lap Timer */
const startLap = () => `${baseURL}/lap-timer/start`;
const pauseLap = () => `${baseURL}/lap-timer/pause`;
const stopLap = () => `${baseURL}/lap-timer/stop`;
const getLaps = () => `${baseURL}/lap-timer/laps`;

/* Authentication */
const authenticate = () => `${baseURL}/authenticate`;

/* Scylla Settings */
const scyllaSettings = () => `${baseURL}/scylla/get_settings`;
const enableUpload = () => `${baseURL}/scylla/upload/enable`;
const disableUpload = () => `${baseURL}/scylla/upload/disable`;
const setBatchTime = (batchTime: number) => `${baseURL}/scylla/batch_time/${batchTime}`;
const setRateLimitMode = (mode: number) => `${baseURL}/scylla/ratelimit_mode/${mode}`;
const setRateLimitTime = (time: number) => `${baseURL}/scylla/static_ratelimit_time/${time}`;
const setDiscardPercentage = (percentage: number) => `${baseURL}/scylla/socket_discard_percent/${percentage}`;

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

  startLap,
  pauseLap,
  stopLap,
  getLaps,

  authenticate,

  scyllaSettings,
  enableUpload,
  disableUpload,
  setBatchTime,
  setRateLimitMode,
  setRateLimitTime,
  setDiscardPercentage
};
