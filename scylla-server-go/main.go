package main

import (
	"log"
	"scylla-server/prisma"
	"time"
)

func main() {
	client, _ := prisma.PrismaClient()

	defer func() {
		if err := client.Prisma.Disconnect(); err != nil {
			log.Fatal("could not disconnect: %w", err)
		}
	}()

	time.Sleep(10 * time.Second)

}
