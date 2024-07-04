package node_service

import (
	"errors"
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
)

// Returns a list of nodes, empty if no nodes exist
//
// If an error occurs nil nodes is returned and the db error
func GetAllNodes() ([]db.NodeModel, error) {
	client, ctx := prisma.PrismaClient()

	data, err := client.Node.FindMany(db.Node.DataTypes.Every()).Exec(ctx)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return []db.NodeModel{}, nil
		} else {
			log.Printf("Err %q\n", err.Error())
			return nil, err
		}
	}

	return data, nil
}

// Upserts a node with the name nodeName, returns the upserted node
//
// Returns nil node and the error if the node does not exist
func UpsertNode(nodeName string) (*db.NodeModel, error) {
	client, ctx := prisma.PrismaClient()

	node, err := client.Node.UpsertOne(db.Node.Name.Equals(nodeName)).Create(db.Node.Name.Set(nodeName)).Update(db.Node.Name.Set(nodeName)).Exec(ctx)
	if err != nil {
		log.Printf("Err %q\n", err.Error())
		return nil, err
	}

	return node, nil
}
