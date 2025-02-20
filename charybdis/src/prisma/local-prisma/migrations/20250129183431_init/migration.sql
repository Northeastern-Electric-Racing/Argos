-- CreateTable
CREATE TABLE "run" (
    "runId" SERIAL NOT NULL,
    "driverName" TEXT NOT NULL DEFAULT '',
    "locationName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "run_pkey" PRIMARY KEY ("runId")
);

-- CreateTable
CREATE TABLE "data" (
    "values" REAL[] NOT NULL,
    "time" BIGINT NOT NULL,
    "dataTypeName" TEXT NOT NULL,
    "runId" INTEGER NOT NULL,

    CONSTRAINT "data_pkey" PRIMARY KEY ("time","dataTypeName")
);

-- CreateTable
CREATE TABLE "data_type" (
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "data_type_pkey" PRIMARY KEY ("name")
);

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "data_type"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("runId") ON DELETE RESTRICT ON UPDATE CASCADE;
