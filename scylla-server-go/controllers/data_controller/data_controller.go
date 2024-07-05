package data_controller

import (
	"scylla-server/services/data_service"
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

	dataByDataTypeName, err := data_service.GetDataByDataTypeNameAndRunId(dataTypeName, runId_int)
	if err != nil {
		panic(err)
	}

	data_json := data_transformer.Data_Transform(&dataByDataTypeName)

	return c.Status(200).JSON(data_json)
}
