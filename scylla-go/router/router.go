package router

import (
	"log"
	"net/http"

	"github.com/Northeastern-Electric-Racing/Argos/controllers"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	socketio "github.com/googollee/go-socket.io"
)

func Routes() http.Handler {
	// Create a new socket.io server
	server, err := socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}

	// Handle socket.io connections
	server.OnConnect("/", func(s socketio.Conn) error {
		log.Println("Connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "message", func(s socketio.Conn, msg string) {
		log.Println("Message:", msg)
		s.Emit("reply", "Received: "+msg)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("Disconnected:", s.ID(), "Reason:", reason)
	})

	router := chi.NewRouter()
	// Use built-In logger middleware
	router.Use(middleware.Logger)
	// Standard router settings
	router.Use(cors.Handler(cors.Options{
		// AllowedOrigins:   []string{"https://foo.com"}, // Use this to allow specific origin hosts
		AllowedOrigins: []string{"https://*", "http://*"},
		// AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Here we link the endpoints to the functions that handle them
	router.Get("/api/users", controllers.GetAllUsers)

	return router

}
