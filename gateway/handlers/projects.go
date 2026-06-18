package handlers

import (
	"net/http"

	"vide-gateway/database"
	"vide-gateway/models"

	"github.com/gin-gonic/gin"
)

func ListProjects(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var projects []models.Project
	database.DB.Where("user_id = ?", userID).Order("updated_at desc").Find(&projects)

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

func CreateProject(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var input struct {
		Title    string  `json:"title" binding:"required"`
		Duration float64 `json:"duration_sec"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project := models.Project{
		ID:       "proj_" + generateID(),
		UserID:   userID.(string),
		Title:    input.Title,
		Status:   "draft",
		DAGOps:   "{}",
		Duration: input.Duration,
	}

	if result := database.DB.Create(&project); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func GetProject(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

func UpdateProject(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var input struct {
		Title string `json:"title"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&project).Update("title", input.Title)

	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).Delete(&models.Project{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "project deleted"})
}

func UpdateProjectDAG(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var input struct {
		DAGOps string `json:"dag_ops" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&project).Update("dag_ops", input.DAGOps)

	c.JSON(http.StatusOK, project)
}

func ListClips(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var clips []models.MediaClip
	database.DB.Where("project_id = ?", projectID).Order("created_at asc").Find(&clips)

	c.JSON(http.StatusOK, gin.H{"clips": clips})
}

func CreateClip(c *gin.Context) {
	userID, _ := c.Get("user_id")
	projectID := c.Param("id")

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var input struct {
		FileName    string  `json:"file_name" binding:"required"`
		FileURI     string  `json:"file_uri" binding:"required"`
		FileSize    int64   `json:"file_size"`
		DurationSec float64 `json:"duration_sec"`
		MimeType    string  `json:"mime_type"`
		Width       int     `json:"width"`
		Height      int     `json:"height"`
		Type        string  `json:"type"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clip := models.MediaClip{
		ID:          "clip_" + generateID(),
		ProjectID:   projectID,
		UserID:      userID.(string),
		FileName:    input.FileName,
		FileURI:     input.FileURI,
		FileSize:    input.FileSize,
		DurationSec: input.DurationSec,
		MimeType:    input.MimeType,
		Width:       input.Width,
		Height:      input.Height,
		Type:        input.Type,
		Status:      "uploaded",
	}

	if input.Type == "" {
		switch {
		case input.MimeType == "video/mp4" || input.MimeType == "video/quicktime":
			clip.Type = "video"
		case input.MimeType == "image/jpeg" || input.MimeType == "image/png":
			clip.Type = "image"
		case input.MimeType == "audio/mp3" || input.MimeType == "audio/wav":
			clip.Type = "audio"
		default:
			clip.Type = "video"
		}
	}

	if result := database.DB.Create(&clip); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create clip"})
		return
	}

	if input.DurationSec > project.Duration {
		database.DB.Model(&project).Update("duration", input.DurationSec)
	}

	c.JSON(http.StatusCreated, clip)
}

func DeleteClip(c *gin.Context) {
	userID, _ := c.Get("user_id")
	clipID := c.Param("clipId")

	var clip models.MediaClip
	if result := database.DB.Where("id = ?", clipID).First(&clip); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "clip not found"})
		return
	}

	if clip.UserID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized"})
		return
	}

	database.DB.Delete(&clip)

	c.JSON(http.StatusOK, gin.H{"message": "clip deleted"})
}
