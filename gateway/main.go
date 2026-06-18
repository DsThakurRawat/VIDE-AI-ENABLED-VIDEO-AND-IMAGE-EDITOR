package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"vide-gateway/database"
	"vide-gateway/handlers"
	"vide-gateway/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database.Connect()

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api/v1")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "ok",
				"service": "vide-gateway",
				"time":    time.Now().UTC(),
			})
		})

		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		protected := api.Group("")
		protected.Use(middleware.AuthRequired())
		{
			protected.GET("/me", handlers.GetCurrentUser)

			projects := protected.Group("/projects")
			{
				projects.GET("/", handlers.ListProjects)
				projects.POST("/", handlers.CreateProject)
				projects.GET("/:id", handlers.GetProject)
				projects.PATCH("/:id", handlers.UpdateProject)
				projects.DELETE("/:id", handlers.DeleteProject)

				projects.GET("/:id/clips", handlers.ListClips)
				projects.POST("/:id/clips", handlers.CreateClip)
				projects.DELETE("/:id/clips/:clipId", handlers.DeleteClip)

				projects.PUT("/:id/dag", handlers.UpdateProjectDAG)
			}

			upload := protected.Group("/upload")
			{
				upload.POST("/presigned-url", handlers.PresignedUploadURL)
			}

			jobs := protected.Group("/jobs")
			{
				jobs.POST("/", handlers.SubmitJob)
				jobs.GET("/:jobId", handlers.GetJobStatus)
			}

			nlp := protected.Group("/nlp")
			{
				nlp.POST("/parse", handlers.ParseNLCommand)
			}
		}
	}

	r.GET("/ws/jobs/:jobId", handlers.JobWebSocket)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting VIDE API Gateway on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
