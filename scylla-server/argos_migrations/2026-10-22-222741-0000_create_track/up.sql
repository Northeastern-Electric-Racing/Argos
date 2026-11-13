CREATE TABLE "track" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    -- each line is [a.lat, a.lon, b.lat, b.lon], or NULL until it is placed
    "startLine" DOUBLE PRECISION[],
    "finishLine" DOUBLE PRECISION[],

    CONSTRAINT "track_pkey" PRIMARY KEY ("id")
);
