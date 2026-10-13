-- CreateTable
CREATE TABLE "track" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startALat" DOUBLE PRECISION,
    "startALon" DOUBLE PRECISION,
    "startBLat" DOUBLE PRECISION,
    "startBLon" DOUBLE PRECISION,
    "finishALat" DOUBLE PRECISION,
    "finishALon" DOUBLE PRECISION,
    "finishBLat" DOUBLE PRECISION,
    "finishBLon" DOUBLE PRECISION,

    CONSTRAINT "track_pkey" PRIMARY KEY ("id")
);
