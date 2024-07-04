package datatype_service

import (
	"errors"
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
)

// Get all of the datatypes as a list, returns empty if none exist
//
// Returns nil datatypes and the error if the db errors
func GetAllDataTypes() ([]db.DataTypeModel, error) {
	client, ctx := prisma.PrismaClient()

	data, err := client.DataType.FindMany().Exec(ctx)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return []db.DataTypeModel{}, nil
		} else {
			log.Printf("Err %q\n", err.Error())
			return nil, err
		}
	}

	return data, nil
}

// Upserts the data type, returning it or the error
func UpsertDataType(dataTypeName string, unit string, nodeName string) (*db.DataTypeModel, error) {
	client, ctx := prisma.PrismaClient()

	data, err := client.DataType.UpsertOne(db.DataType.Name.Equals(dataTypeName)).Create(db.DataType.Name.Set(dataTypeName), db.DataType.Unit.Set(unit), db.DataType.Node.Link(db.Node.Name.Equals(nodeName))).Update(db.DataType.Name.Set(dataTypeName), db.DataType.Unit.Set(unit), db.DataType.Node.Link(db.Node.Name.Equals(nodeName))).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}
	return data, nil
}
