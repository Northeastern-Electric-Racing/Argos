package main

import (
	"errors"
	"fmt"
	"log"
	"scylla-server/prisma"
	"scylla-server/prisma/db"
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

	app := fiber.New(fiber.Config{Immutable: true, ErrorHandler: func(ctx *fiber.Ctx, err error) error {
		// first, if its a fiber error return it as its already setup, basically this copies the default handler
		code := fiber.StatusInternalServerError
		var e *fiber.Error
		if errors.As(err, &e) {
			code = e.Code
			ctx.Set(fiber.HeaderContentType, fiber.MIMETextPlainCharsetUTF8)
			return ctx.Status(code).SendString(err.Error())
		}

		// now if it isnt a fiber error, time to check over the db errors
		if db.IsErrNotFound(err) {
			return ctx.Status(404).SendString("db: ErrNotFound")
		}
		if info, err := db.IsErrUniqueConstraint(err); err {
			return ctx.Status(400).SendString(fmt.Sprintf("db: ErrUniqueConstraint on fields: %s, and with field conflict: %s", info.Message, info.Fields))
		}

		return ctx.Status(500).SendString(err.Error())

	}})

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
