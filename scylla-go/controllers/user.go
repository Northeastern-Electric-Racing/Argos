package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Northeastern-Electric-Racing/Argos/database"
)

func GetAllUsers(w http.ResponseWriter, r *http.Request) {
	pClient := database.PClient
	allUsers, err := pClient.Client.User.FindMany().Exec(pClient.Context)
	if err != nil {
		fmt.Println("Cannot fetch users")
		return

	}
	usersMap := make(map[string]interface{})
	usersMap["users"] = allUsers

	out, err := json.MarshalIndent(usersMap, "", "\t")
	if err != nil {
		fmt.Println("Error Creating JSON")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(out)
	if err != nil {
		fmt.Println("Error writing to response")
		return
	}
}
