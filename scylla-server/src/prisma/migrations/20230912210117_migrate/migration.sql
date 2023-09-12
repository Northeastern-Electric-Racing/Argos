-- CreateTable
CREATE TABLE "Run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locationName" TEXT NOT NULL,
    "driverId" TEXT,
    "systemId" TEXT,
    "time" DATETIME NOT NULL,
    CONSTRAINT "Run_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "Location" ("name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("username") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Run_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("name") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Driver" (
    "username" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "System" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" INTEGER NOT NULL,
    "dataTypeName" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "runId" INTEGER NOT NULL,
    CONSTRAINT "Data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "DataType" ("name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataType" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "unit" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    CONSTRAINT "DataType_nodeName_fkey" FOREIGN KEY ("nodeName") REFERENCES "Node" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Node" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateIndex
CREATE UNIQUE INDEX "Run_id_key" ON "Run"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_username_key" ON "Driver"("username");

-- CreateIndex
CREATE UNIQUE INDEX "System_name_key" ON "System"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Data_id_key" ON "Data"("id");

-- CreateIndex
CREATE UNIQUE INDEX "DataType_name_key" ON "DataType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Node_name_key" ON "Node"("name");
