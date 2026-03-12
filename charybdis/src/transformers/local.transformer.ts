import { LocalRun } from "../types/local.types";
import { v4 as uuidV4 } from "uuid";

export const localRunToCsvRunRow = (localRun: LocalRun) => {
  return {
    uuid: uuidV4(),
    runId: localRun.runId,
    driverName: localRun.driverName,
    locationName: localRun.locationName,
    notes: localRun.notes,
    time: localRun.time.toString(),
  };
};
