/*
  Warnings:

  - You are about to drop the column `name` on the `Run` table. All the data in the column will be lost.
  - Added the required column `locationName` to the `Run` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Run` table without a default value. This is not possible if the table is not empty.

*/
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
    "time" DATETIME NOT NULL,
    "runId" INTEGER NOT NULL,
    CONSTRAINT "Data_dataTypeName_fkey" FOREIGN KEY ("dataTypeName") REFERENCES "DataType" ("name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataType" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "unit" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "nodeName" TEXT NOT NULL,
    CONSTRAINT "DataType_nodeName_fkey" FOREIGN KEY ("nodeName") REFERENCES "Node" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Node" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locationName" TEXT NOT NULL,
    "driverId" TEXT,
    "systemId" TEXT,
    "time" DATETIME NOT NULL,
    CONSTRAINT "Run_locationName_fkey" FOREIGN KEY ("locationName") REFERENCES "Location" ("name") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Run_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("username") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Run_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("name") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("id") SELECT "id" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
CREATE UNIQUE INDEX "Run_driverId_key" ON "Run"("driverId");
CREATE UNIQUE INDEX "Run_systemId_key" ON "Run"("systemId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
