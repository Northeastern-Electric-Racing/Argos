package data_controller

import (
	"errors"
	"scylla-server/prisma/db"
	"scylla-server/transformers/data_transformer"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

func GetDataByDataTypeNameAndRunId(c *fiber.Ctx) error {
	dataTypeName := c.Params("dataTypeName")
	runId := c.Params("runId")

	runId_int, err := strconv.Atoi(runId)
	if err != nil {
		return fiber.NewError(400, "Could not parse run ID")
	}
	dataByDataTypeName, err := data_transformer.GetDataByDataTypeNameAndRunId(dataTypeName, runId_int)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			return fiber.NewError(404, err.Error())
		}
		return fiber.NewError(503, err.Error())
	}

	return c.Status(200).JSON(dataByDataTypeName)
}
