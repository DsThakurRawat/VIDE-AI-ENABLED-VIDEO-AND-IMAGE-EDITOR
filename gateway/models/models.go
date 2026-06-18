package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	Email     string         `gorm:"uniqueIndex" json:"email"`
	Name      string         `json:"name"`
	Password  string         `json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Project struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	UserID    string         `gorm:"index;not null" json:"user_id"`
	Title     string         `json:"title"`
	Status    string         `gorm:"default:draft" json:"status"`
	DAGOps    string         `gorm:"type:jsonb" json:"dag_ops"`
	Duration  float64        `gorm:"default:0" json:"duration_sec"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type MediaClip struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	ProjectID   string         `gorm:"index;not null" json:"project_id"`
	UserID      string         `gorm:"index;not null" json:"user_id"`
	FileName    string         `json:"file_name"`
	FileURI     string         `json:"file_uri"`
	ProxyURI    string         `json:"proxy_uri"`
	ThumbnailURI string        `json:"thumbnail_uri"`
	FileSize    int64          `json:"file_size"`
	DurationSec float64        `json:"duration_sec"`
	Width       int            `json:"width"`
	Height      int            `json:"height"`
	MimeType    string         `json:"mime_type"`
	Type        string         `json:"type"`
	Status      string         `gorm:"default:uploaded" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Job struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	UserID        string    `gorm:"index;not null" json:"user_id"`
	ProjectID     string    `gorm:"index;not null" json:"project_id"`
	Type          string    `json:"type"`
	Status        string    `gorm:"default:queued" json:"status"`
	Progress      float64   `gorm:"default:0" json:"progress"`
	DAGJSON       string    `gorm:"type:jsonb" json:"dag_json"`
	ResultURI     string    `json:"result_uri"`
	Error         string    `json:"error,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type OperationNode struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ProjectID string    `gorm:"index;not null" json:"project_id"`
	ClipID    string    `gorm:"index" json:"clip_id"`
	Type      string    `json:"type"`
	Params    string    `gorm:"type:jsonb" json:"params"`
	Order     int       `json:"order"`
	ParentID  string    `gorm:"index" json:"parent_id"`
	CreatedAt time.Time `json:"created_at"`
}
