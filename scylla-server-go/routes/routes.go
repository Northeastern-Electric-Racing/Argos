package routes

import (
	"scylla-server/controllers/data_controller"

	"github.com/gofiber/fiber/v2"
)

func CreateRoutes(app *fiber.App) {

	// route for all data requests
	dataRoute := app.Group("/data")
	dataRoute.Get("/:dataTypeName/:runId", data_controller.GetDataByDataTypeNameAndRunId)
}
