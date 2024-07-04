package run_service

import (
	"errors"
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
	"time"
)

// Returns a list of runs, empty if no runs exist
//
// If an error occurs return nil runs and the error
func GetAllRuns() ([]db.RunModel, error) {
	client, ctx := prisma.PrismaClient()
	runs, err := client.Run.FindMany().Exec(ctx)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return []db.RunModel{}, nil
		} else {
			log.Printf("Err %q\n", err.Error())
			return nil, err
		}
	}

	return runs, nil
}

// Returns a specifc run with the id or the db error
func GetRunById(id int) (*db.RunModel, error) {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.FindUnique(db.Run.ID.Equals(id)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
	}

	return run, err
}

// Creates a run with the given timestamp and autoincremented id
//
// Returns the created run or the db error
func CreateRun(timestamp int64) (*db.RunModel, error) {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.CreateOne(db.Run.Time.Set(time.UnixMilli(timestamp))).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
	}

	return run, err

}

// Creates a run with the given timestamp and id
//
// Returns the created run or the db error
func CreateRunWithId(timestamp int64, id int) (*db.RunModel, error) {
	client, ctx := prisma.PrismaClient()

	run, err := client.Run.CreateOne(db.Run.Time.Set(time.UnixMilli(timestamp)), db.Run.ID.Set(id)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
	}

	return run, err
}
