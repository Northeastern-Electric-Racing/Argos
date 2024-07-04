package main

import (
	"log"
	"scylla-server/prisma"
	"scylla-server/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	client, _ := prisma.PrismaClient()

	defer func() {
		if err := client.Prisma.Disconnect(); err != nil {
			log.Fatal("could not disconnect: %w", err)
		}
	}()

	app := fiber.New(fiber.Config{Immutable: true})

	app.Use(recover.New())

	routes.CreateRoutes(app)

	app.Listen(":8000")

	// run_service.CreateRunWithId(1720109005110, 10)
	// log.Println("here")

	// node_service.UpsertNode("abc")
	// datatype_service.UpsertDataType("Hello-World", "ggg", "abc")

	// data_service.AddData(serverdata.ServerData{
	// 	Values: []string{"1234"},
	// 	Unit:   "ggg",
	// }, 1720109005136, "Hello-World", 10)

	//time.Sleep(10 * time.Second)

}
