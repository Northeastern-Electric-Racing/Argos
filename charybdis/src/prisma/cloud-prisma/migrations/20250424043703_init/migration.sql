
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        CREATE EXTENSION timescaledb;
    END IF;
END $$;

-- CreateTable
CREATE TABLE "run" (
    "id" TEXT NOT NULL,
    "runId" SERIAL NOT NULL,
    "driverName" TEXT,
    "locationName" TEXT,
    "notes" TEXT,
    "time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data" (
    "values" DOUBLE PRECISION[],
    "time" TIMESTAMPTZ NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "run_runId_time_key" ON "run"("runId", "time");

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "data_type"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

SELECT * FROM create_hypertable('data', by_range('time'));
SELECT * FROM add_dimension('data', by_hash('dataTypeName', 4));

ALTER TABLE "data" SET (timescaledb.compress,
   timescaledb.compress_orderby = 'time DESC',
   timescaledb.compress_segmentby = '"runId", "dataTypeName"',
   timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_compression_policy('data', compress_after => INTERVAL '1d');