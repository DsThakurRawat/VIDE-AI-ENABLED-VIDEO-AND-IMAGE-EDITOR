package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type NLPRequest struct {
	Command      string `json:"command"`
	VideoContext string `json:"video_context"`
	TimelineJSON string `json:"timeline_json"`
}

type NLPResponse struct {
	PlanID     string           `json:"plan_id"`
	Summary    string           `json:"summary"`
	Operations []Operation      `json:"operations"`
}

type Operation struct {
	Op     string         `json:"op"`
	Params map[string]any `json:"params,omitempty"`
}

func ParseNLCommand(c *gin.Context) {
	userID, _ := c.Get("user_id")
	_ = userID

	var input struct {
		Command      string `json:"command" binding:"required"`
		VideoContext string `json:"video_context"`
		TimelineJSON string `json:"timeline_json"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workerURL := os.Getenv("NLP_WORKER_URL")
	if workerURL == "" {
		workerURL = "http://localhost:8000/nlp/parse"
	}

	nlpReq := NLPRequest{
		Command:      input.Command,
		VideoContext: input.VideoContext,
		TimelineJSON: input.TimelineJSON,
	}

	body, _ := json.Marshal(nlpReq)

	resp, err := http.Post(workerURL, "application/json", bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusOK, fallbackParse(input.Command))
		return
	}
	defer resp.Body.Close()

	var nlpResp NLPResponse
	if err := json.NewDecoder(resp.Body).Decode(&nlpResp); err != nil {
		c.JSON(http.StatusOK, fallbackParse(input.Command))
		return
	}

	c.JSON(http.StatusOK, nlpResp)
}

func fallbackParse(command string) NLPResponse {
	ops := []Operation{}

	if containsAny(command, "trim", "cut", "remove", "delete") {
		ops = append(ops, Operation{Op: "trim", Params: map[string]any{"start": 0, "end": 10}})
	}
	if containsAny(command, "fade") {
		ops = append(ops, Operation{Op: "transition", Params: map[string]any{"type": "fade", "duration_ms": 500}})
	}
	if containsAny(command, "color", "grade", "lut", "warm", "vintage") {
		ops = append(ops, Operation{Op: "color_grade", Params: map[string]any{"lut": "warm_vintage"}})
	}
	if containsAny(command, "brightness", "bright") {
		ops = append(ops, Operation{Op: "brightness", Params: map[string]any{"value": 0.1}})
	}
	if containsAny(command, "contrast") {
		ops = append(ops, Operation{Op: "contrast", Params: map[string]any{"value": 0.1}})
	}
	if containsAny(command, "saturation") {
		ops = append(ops, Operation{Op: "saturation", Params: map[string]any{"value": 0.15}})
	}
	if containsAny(command, "export") {
		ops = append(ops, Operation{Op: "export", Params: map[string]any{"resolution": "1080p", "codec": "h264"}})
	}
	if containsAny(command, "denoise", "noise", "clean") {
		ops = append(ops, Operation{Op: "denoise_audio"})
	}
	if containsAny(command, "background", "remove") {
		ops = append(ops, Operation{Op: "remove_background"})
	}
	if containsAny(command, "upscale", "4k", "hd") {
		ops = append(ops, Operation{Op: "upscale", Params: map[string]any{"factor": 2}})
	}

	summary := "Parsed " + command
	if len(ops) > 0 {
		summary = "I'll apply the following operations: "
		for i, op := range ops {
			if i > 0 {
				summary += ", "
			}
			summary += op.Op
		}
	}

	return NLPResponse{
		PlanID:     "plan_" + generateID(),
		Summary:    summary,
		Operations: ops,
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, substr := range substrs {
		if contains(s, substr) {
			return true
		}
	}
	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsBytes([]byte(s), []byte(substr))
}

func containsBytes(s, substr []byte) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] && (s[i+j] >= 'A' && s[i+j] <= 'Z' && s[i+j]+32 != substr[j]) && (s[i+j] >= 'a' && s[i+j] <= 'z' && s[i+j]-32 != substr[j]) {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
