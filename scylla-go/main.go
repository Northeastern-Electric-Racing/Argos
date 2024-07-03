package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Northeastern-Electric-Racing/Argos/database"
	"github.com/Northeastern-Electric-Racing/Argos/router"
	"github.com/joho/godotenv"
)

type Config struct {
	Port string
}

type Application struct {
	Config Config
}

func (app *Application) Serve() error {
	port := app.Config.Port
	fmt.Printf("Serving app on port %s", port)
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: router.Routes(), // This handles the routing
	}
	return srv.ListenAndServe()
}

func main() {
	// Load ENV variables
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	// Handle DB connection
	db, err := database.ConnectDB()
	if err != nil {
		log.Fatal("Cannot connect to database")
	}
	// Defer disconnect until program stops
	defer db.Client.Disconnect()

	config := Config{
		Port: os.Getenv("PORT"),
	}
	// Create App
	app := &Application{
		Config: config,
	}
	// Serve and Listen
	err = app.Serve()
	if err != nil {
		log.Fatal(err)
	}

}
