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

func GetDataByDataTypeNameAndRunId(dataTypeName string, runId int) []db.DataModel {
	client, ctx := prisma.PrismaClient()

	dataType, err := client.DataType.FindUnique(db.DataType.Name.Equals(dataTypeName)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	run := run_service.GetRunById(runId)

	queried, err := client.Data.FindMany(db.Data.DataTypeName.Equals(dataType.Name), db.Data.RunID.Equals(run.ID)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	// TODO no sorting done or mapping

	return queried
}

func AddData(serverData serverdata.ServerData, unixTime int64, dataTypeName string, runId int) *db.DataModel {
	client, ctx := prisma.PrismaClient()

	dataType, err := client.DataType.FindUnique(db.DataType.Name.Equals(dataTypeName)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	run, err := client.Run.FindUnique(db.Run.ID.Equals(runId)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	var numbers []float64
	for _, val := range serverData.Values {
		if n, err := strconv.ParseFloat(val, 64); err == nil {
			numbers = append(numbers, n)
		}
	}

	created, err := client.Data.CreateOne(db.Data.DataType.Link(db.DataType.Name.Set(dataType.Name)), db.Data.Time.Set(time.UnixMilli(unixTime)), db.Data.Run.Link(db.Run.ID.Equals(run.ID)), db.Data.Values.Set(numbers)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	return created

}
