package main

import (
	"scylla-server/prisma"
	"time"
)

func main() {
	client, _ := prisma.PrismaClient()

	time.Sleep(10 * time.Second)

	client.Prisma.Disconnect()

}
