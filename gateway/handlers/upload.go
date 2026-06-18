package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var minioClient *minio.Client

func init() {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:9000"
	}
	accessKey := os.Getenv("MINIO_ACCESS_KEY")
	if accessKey == "" {
		accessKey = "admin"
	}
	secretKey := os.Getenv("MINIO_SECRET_KEY")
	if secretKey == "" {
		secretKey = "password123"
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		return
	}
	minioClient = client
}

func PresignedUploadURL(c *gin.Context) {
	if minioClient == nil {
		c.JSON(http.StatusOK, gin.H{
			"uploadUrl": "http://placeholder.local/upload",
			"fileId":    "file_" + generateID(),
			"method":    "PUT",
		})
		return
	}

	var input struct {
		FileName string `json:"filename" binding:"required"`
		MimeType string `json:"mimeType" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bucket := os.Getenv("MINIO_BUCKET")
	if bucket == "" {
		bucket = "vide-uploads"
	}

	err := minioClient.MakeBucket(c.Request.Context(), bucket, minio.MakeBucketOptions{})
	if err != nil {
		exists, _ := minioClient.BucketExists(c.Request.Context(), bucket)
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create bucket"})
			return
		}
	}

	fileID := "file_" + generateID()
	objectName := fileID + "/" + input.FileName

	presignedURL, err := minioClient.PresignedPutObject(c.Request.Context(), bucket, objectName, 15*time.Minute)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate presigned URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"uploadUrl": presignedURL.String(),
		"fileId":    fileID,
		"fileUri":   "s3://" + bucket + "/" + objectName,
		"method":    "PUT",
	})
}
