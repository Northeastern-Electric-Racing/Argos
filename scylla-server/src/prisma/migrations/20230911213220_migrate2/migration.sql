/*
  Warnings:

  - You are about to drop the column `nodeId` on the `DataType` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `Data` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Node` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `Run` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `System` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Run_systemId_key";

-- DropIndex
DROP INDEX "Run_driverId_key";

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataType" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "unit" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    CONSTRAINT "DataType_nodeName_fkey" FOREIGN KEY ("nodeName") REFERENCES "Node" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DataType" ("name", "nodeName", "unit") SELECT "name", "nodeName", "unit" FROM "DataType";
DROP TABLE "DataType";
ALTER TABLE "new_DataType" RENAME TO "DataType";
CREATE UNIQUE INDEX "DataType_name_key" ON "DataType"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Data_id_key" ON "Data"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_username_key" ON "Driver"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Node_name_key" ON "Node"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Run_id_key" ON "Run"("id");

-- CreateIndex
CREATE UNIQUE INDEX "System_name_key" ON "System"("name");
