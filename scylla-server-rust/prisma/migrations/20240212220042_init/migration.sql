-- CreateTable
CREATE TABLE "run" (
    "id" SERIAL NOT NULL,
    "locationName" TEXT,
    "driverName" TEXT,
    "systemName" TEXT,
    "time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "driver" (
    "username" TEXT NOT NULL,

    CONSTRAINT "driver_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "system" (
    "name" TEXT NOT NULL,

    CONSTRAINT "system_pkey" PRIMARY KEY ("name")
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

-- CreateTable
CREATE TABLE "node" (
    "name" TEXT NOT NULL,

    CONSTRAINT "node_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "run_id_key" ON "run"("id");

-- CreateIndex
CREATE UNIQUE INDEX "location_name_key" ON "location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "driver_username_key" ON "driver"("username");

-- CreateIndex
CREATE UNIQUE INDEX "system_name_key" ON "system"("name");

-- CreateIndex
CREATE UNIQUE INDEX "data_id_time_key" ON "data"("id", "time");

SELECT * FROM create_hypertable('data', by_range('time'));
SELECT * FROM add_dimension('data', by_hash('id', 4));

-- CreateIndex
CREATE UNIQUE INDEX "dataType_name_key" ON "dataType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "node_name_key" ON "node"("name");

-- AddForeignKey
ALTER TABLE "run" ADD CONSTRAINT "run_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "location"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run" ADD CONSTRAINT "run_driverName_fkey" FOREIGN KEY ("driverName") REFERENCES "driver"("username") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run" ADD CONSTRAINT "run_systemName_fkey" FOREIGN KEY ("systemName") REFERENCES "system"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "dataType"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataType" ADD CONSTRAINT "dataType_nodeName_fkey" FOREIGN KEY ("nodeName") REFERENCES "node"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "data" SET (timescaledb.compress,
   timescaledb.compress_orderby = 'time DESC',
   timescaledb.compress_segmentby = '"runId", "dataTypeName"',
   timescaledb.compress_chunk_time_interval='24 hours'
);

SELECT add_compression_policy('data', compress_after => INTERVAL '1d');