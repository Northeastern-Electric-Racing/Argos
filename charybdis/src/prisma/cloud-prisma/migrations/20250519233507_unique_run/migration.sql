/*
  Warnings:

  - A unique constraint covering the columns `[time]` on the table `run` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "data" DROP CONSTRAINT "data_runId_fkey";

-- DropIndex
DROP INDEX "data_time_idx";

-- CreateIndex
CREATE UNIQUE INDEX "run_time_key" ON "run"("time");

-- AddForeignKey
ALTER TABLE "data" ADD CONSTRAINT "data_runId_fkey" FOREIGN KEY ("runId") REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
