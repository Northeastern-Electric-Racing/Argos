package run_service

import (
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
	"time"
)

func GetAllRuns() []db.RunModel {
	client, ctx := prisma.PrismaClient()
	runs, err := client.Run.FindMany().Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	// TODO: no mapping done

	return runs
}

func GetRunById(id int) *db.RunModel {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.FindUnique(db.Run.ID.Equals(id)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	return run
}

func CreateRun(timestamp int64) *db.RunModel {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.CreateOne(db.Run.Time.Set(time.UnixMilli(timestamp))).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	return run

}

func CreateRunWithId(timestamp int64, id int) *db.RunModel {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.CreateOne(db.Run.Time.Set(time.UnixMilli(timestamp)), db.Run.ID.Set(id)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	return run
}
