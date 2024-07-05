package location_service

import (
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
	"scylla-server/services/run_service"
)

// Gets all the locations, or returns nil and the error
func GetAllLocations() ([]db.LocationModel, error) {
	client, ctx := prisma.PrismaClient()

	locations, err := client.Location.FindMany().Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return locations, nil

}

// Upserts a location and returns it, or returns nil and the error
func UpsertLocation(name string, latitude float64, longitude float64, radius float64, runId int) (*db.LocationModel, error) {
	client, ctx := prisma.PrismaClient()

	location, err := client.Location.UpsertOne(db.Location.Name.Equals(name)).Update(db.Location.Latitude.Set(latitude), db.Location.Longitude.Set(longitude), db.Location.Radius.Set(radius)).Create(db.Location.Name.Set(name), db.Location.Latitude.Set(latitude), db.Location.Longitude.Set(longitude), db.Location.Radius.Set(radius)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	// TODO is this needed?
	run_service.GetRunById(runId)

	_, err = client.Run.FindUnique(db.Run.ID.Equals(runId)).Update(db.Run.Location.Link(db.Location.Name.Equals(name))).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return location, nil
}
