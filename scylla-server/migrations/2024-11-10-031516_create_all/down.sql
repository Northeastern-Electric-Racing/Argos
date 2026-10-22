-- Drop Foreign Keys
ALTER TABLE "data" DROP CONSTRAINT "data_runId_fkey";
ALTER TABLE "data" DROP CONSTRAINT "data_dataTypeName_fkey";

-- Drop Tables
DROP TABLE "data";
DROP TABLE "dataType";
DROP TABLE "run";
