package data_service

import (
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
	"scylla-server/protobuf/serverdata"
	"scylla-server/services/run_service"
	"strconv"
	"time"
)

// Get a list of data points based on the dataTypeName and the run ID it is contained in
//
// Returns a nil list if the dataTypeName or runId does not exist
func GetDataByDataTypeNameAndRunId(dataTypeName string, runId int) ([]db.DataModel, error) {
	client, ctx := prisma.PrismaClient()

	// TODO is this needed?
	dataType, err := client.DataType.FindUnique(db.DataType.Name.Equals(dataTypeName)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	// TODO is this needed?
	run, err := run_service.GetRunById(runId)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	queried, err := client.Data.FindMany(db.Data.DataTypeName.Equals(dataType.Name), db.Data.RunID.Equals(run.ID)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return queried, err
}

// Adds a serverdata representation to the db at dataTypeName location with id of runId
//
// Returns the datamodel inserted or an error
func AddData(serverData *serverdata.ServerData, unixTime int64, dataTypeName string, runId int) (*db.DataModel, error) {
	client, ctx := prisma.PrismaClient()

	dataType, err := client.DataType.FindUnique(db.DataType.Name.Equals(dataTypeName)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	run, err := client.Run.FindUnique(db.Run.ID.Equals(runId)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	var numbers []float64
	for _, val := range serverData.Values {
		if n, err := strconv.ParseFloat(val, 64); err == nil {
			numbers = append(numbers, n)
		} else {
			log.Printf("Err %q\n", err.Error())
			return nil, err
		}
	}

	created, err := client.Data.CreateOne(db.Data.DataType.Link(db.DataType.Name.Set(dataType.Name)), db.Data.Time.Set(time.UnixMilli(unixTime)), db.Data.Run.Link(db.Run.ID.Equals(run.ID)), db.Data.Values.Set(numbers)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return created, nil

}
