package data_transformer

import (
	"scylla-server/prisma/db"
	"scylla-server/services/data_service"
	"strconv"

	"github.com/samber/lo"
)

type TransformerData struct {
	Time   int64
	Values []string
}

func GetDataByDataTypeNameAndRunId(dataTypeName string, runId int) ([]TransformerData, error) {
	dataByDataTypeName, err := data_service.GetDataByDataTypeNameAndRunId(dataTypeName, runId)
	if err != nil {
		return nil, err
	}

	data_transformed := lo.Map(dataByDataTypeName, func(d db.DataModel, _ int) TransformerData {
		return TransformerData{
			Time: d.Time.UnixMilli(),
			Values: lo.Map(d.Values, func(v float64, _ int) string {
				return strconv.FormatFloat(v, 'f', 10, 64)
			}),
		}
	})

	return data_transformed, nil

}
