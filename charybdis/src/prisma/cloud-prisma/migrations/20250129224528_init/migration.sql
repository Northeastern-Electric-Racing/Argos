-- CreateTable
CREATE TABLE "run" (
    "id" TEXT NOT NULL,
    "runId" SERIAL NOT NULL,
    "driverName" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data" (
    "values" DOUBLE PRECISION[],
    "time" BIGINT NOT NULL,
    "dataTypeName" TEXT NOT NULL,
    "runId" TEXT NOT NULL,

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
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
