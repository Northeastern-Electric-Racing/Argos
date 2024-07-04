package data_transformer

import (
	"scylla-server/prisma/db"
	"sort"
	"strconv"

	"github.com/samber/lo"
)

type TransformerData struct {
	Time   int64    `json:"time"`
	Values []string `json:"values"`
}

func Data_Transform(dataByDataTypeName *[]db.DataModel) []TransformerData {

	data_transformed := lo.Map(*dataByDataTypeName, func(d db.DataModel, _ int) TransformerData {
		return TransformerData{
			Time: d.Time.UnixMilli(),
			Values: lo.Map(d.Values, func(v float64, _ int) string {
				return strconv.FormatFloat(v, 'f', 10, 64)
			}),
		}
	})

	sort.Slice(data_transformed, func(i, j int) bool {
		return data_transformed[i].Time < data_transformed[j].Time
	})

	return data_transformed

}
