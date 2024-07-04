package node_service

import (
	"errors"
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
)

func GetAllNodes() []db.NodeModel {
	client, ctx := prisma.PrismaClient()

	data, err := client.Node.FindMany(db.Node.DataTypes.Every()).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	return data
}

func UpsertNode(nodeName string) *db.NodeModel {
	client, ctx := prisma.PrismaClient()

	node, err := client.Node.FindUnique(db.Node.Name.Equals(nodeName)).Exec(ctx)
	log.Printf("Err %q\n", err.Error())

	if err != nil && errors.Is(err, db.ErrNotFound) {
		node, err := client.Node.CreateOne(db.Node.Name.Set(nodeName)).Exec(ctx)
		log.Printf("Err %q\n", err.Error())
		return node
	}
	return node

}
