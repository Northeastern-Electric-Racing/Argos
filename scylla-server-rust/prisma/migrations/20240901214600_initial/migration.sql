-- CreateTable
CREATE TABLE "run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locationName" TEXT,
    "driverName" TEXT,
    "systemName" TEXT,
    "time" DATETIME NOT NULL,
    CONSTRAINT "run_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "location" ("name") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "run_driverName_fkey" FOREIGN KEY ("driverName") REFERENCES "driver" ("username") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "run_systemName_fkey" FOREIGN KEY ("systemName") REFERENCES "system" ("name") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "driver" (
    "username" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "system" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "data" (
    "id" TEXT NOT NULL,
    "values" REAL NOT NULL,
    "dataTypeName" TEXT NOT NULL,
    "time" DATETIME NOT NULL,
    "runId" INTEGER NOT NULL,
    CONSTRAINT "data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "dataType" ("name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dataType" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "unit" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    CONSTRAINT "dataType_nodeName_fkey" FOREIGN KEY ("nodeName") REFERENCES "node" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "node" (
    "name" TEXT NOT NULL PRIMARY KEY
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

-- CreateIndex
CREATE UNIQUE INDEX "dataType_name_key" ON "dataType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "node_name_key" ON "node"("name");
