package routes

import (
	"scylla-server/controllers/data_controller"
	"scylla-server/routes/groups"

	"github.com/gofiber/fiber/v2"
)

func CreateRoutes(app *fiber.App) {

	// route for all data requests
	groups.CreateDataRoute(app)

}
