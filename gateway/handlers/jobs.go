package handlers

import (
	"encoding/json"
	"net/http"
	"sync"

	"vide-gateway/database"
	"vide-gateway/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type JobHub struct {
	mu      sync.RWMutex
	clients map[string][]*websocket.Conn
}

var hub = &JobHub{clients: make(map[string][]*websocket.Conn)}

func SubmitJob(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var input struct {
		ProjectID string `json:"project_id" binding:"required"`
		Type      string `json:"type" binding:"required"`
		DAGJSON   string `json:"dag_json"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var project models.Project
	if result := database.DB.Where("id = ? AND user_id = ?", input.ProjectID, userID).First(&project); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	job := models.Job{
		ID:        "job_" + generateID(),
		UserID:    userID.(string),
		ProjectID: input.ProjectID,
		Type:      input.Type,
		Status:    "queued",
		Progress:  0,
		DAGJSON:   input.DAGJSON,
	}

	if result := database.DB.Create(&job); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create job"})
		return
	}

	database.DB.Model(&project).Update("status", "processing")

	go processJobAsync(&job)

	c.JSON(http.StatusAccepted, gin.H{
		"job_id":  job.ID,
		"status":  job.Status,
		"message": "job queued",
	})
}

func GetJobStatus(c *gin.Context) {
	userID, _ := c.Get("user_id")
	jobID := c.Param("jobId")

	var job models.Job
	if result := database.DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

func JobWebSocket(c *gin.Context) {
	jobID := c.Param("jobId")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	hub.mu.Lock()
	hub.clients[jobID] = append(hub.clients[jobID], conn)
	hub.mu.Unlock()

	defer func() {
		hub.mu.Lock()
		conns := hub.clients[jobID]
		for i, c := range conns {
			if c == conn {
				hub.clients[jobID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		hub.mu.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func broadcastJobProgress(jobID string, status string, progress float64, resultURI string) {
	msg, _ := json.Marshal(gin.H{
		"job_id":     jobID,
		"status":     status,
		"progress":   progress,
		"result_uri": resultURI,
	})

	hub.mu.RLock()
	conns := hub.clients[jobID]
	hub.mu.RUnlock()

	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func processJobAsync(job *models.Job) {
	broadcastJobProgress(job.ID, "processing", 0, "")

	database.DB.Model(job).Updates(map[string]interface{}{
		"status":   "processing",
		"progress": 10,
	})
	broadcastJobProgress(job.ID, "processing", 10, "")

	database.DB.Model(job).Updates(map[string]interface{}{
		"status":   "completed",
		"progress": 100,
		"result_uri": "s3://vide-exports/" + job.ID + "/output.mp4",
	})
	broadcastJobProgress(job.ID, "completed", 100, "s3://vide-exports/"+job.ID+"/output.mp4")
}
