package groups

import (
	"scylla-server/controllers/data_controller"

	"github.com/gofiber/fiber/v2"
)

func CreateDataRoute(app *fiber.App) {
	dataRoute := app.Group("/data")
	dataRoute.Get("/:dataTypeName/:runId", data_controller.GetDataByDataTypeNameAndRunId)
}
