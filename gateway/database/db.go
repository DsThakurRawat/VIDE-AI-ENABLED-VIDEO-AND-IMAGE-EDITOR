package database

import (
	"log"
	"os"

	"vide-gateway/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=admin password=password dbname=videdb port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.MediaClip{},
		&models.Job{},
		&models.OperationNode{},
	)
	if err != nil {
		log.Fatal("Failed to AutoMigrate:", err)
	}

	DB = db
	log.Println("Database connected and migrated.")
}
