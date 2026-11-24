-- each Run's laps on each track, saved as the next Run starts; run ids restart when the car database is wiped and
-- this one is not, so a lap's times tell those Runs apart
CREATE TABLE "lap" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "startMs" DOUBLE PRECISION NOT NULL,
    "endMs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "lap_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lap" ADD CONSTRAINT "lap_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
