-- CreateTable
CREATE TABLE "run" (
    "id" SERIAL NOT NULL,
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "driverName" TEXT,
    "notes" TEXT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data" (
    "id" TEXT NOT NULL,
    "values" DOUBLE PRECISION[],
    "dataTypeName" TEXT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL,
    "runId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "dataType" (
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,

    CONSTRAINT "dataType_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "run_id_key" ON "run"("id");

-- CreateIndex
CREATE UNIQUE INDEX "data_id_time_key" ON "data"("id", "time");

-- CreateIndex
CREATE UNIQUE INDEX "dataType_name_key" ON "dataType"("name");

SELECT * FROM create_hypertable('data', by_range('time'));
SELECT * FROM add_dimension('data', by_hash('id', 4));

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "dataType"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "data" SET (timescaledb.compress,
   timescaledb.compress_orderby = 'time DESC',
   timescaledb.compress_segmentby = '"runId", "dataTypeName"',
   timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_compression_policy('data', compress_after => INTERVAL '1d');
