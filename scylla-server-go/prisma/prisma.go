package prisma

import (
	"context"
	"log"
	"scylla-server/prisma/db"
	"sync"
)

var client *db.PrismaClient = db.NewClient()
var once sync.Once

// PrismaClient returns default prismaclient instance
// it initialised the prismaclient if not initilaised
func PrismaClient() (*db.PrismaClient, context.Context) {
	once.Do(func() {
		log.Println("Connecting to database...")
		if err := client.Prisma.Connect(); err != nil {
			log.Fatal(err)
		}
	})
	return client, context.Background()

}
