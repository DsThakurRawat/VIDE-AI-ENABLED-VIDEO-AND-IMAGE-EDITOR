# VIDE Project Guide

## Overview
VIDE is an AI-native creative suite for video and image editing with natural language interface and non-destructive DAG editing.

## Architecture
- **gateway/**: Go API Gateway (Gin) - JWT auth, PostgreSQL, MinIO, WebSocket, job queue
- **frontend/**: Next.js 15 + React 19 - timeline editor, command bar, preview
- **workers/**: Python 3.12 - FFmpeg operations, NLP planner, AI model integration

## Key Commands

### Start infrastructure:
```bash
docker compose up -d
```

### Start gateway:
```bash
cd gateway && go run main.go
```

### Start frontend:
```bash
cd frontend && npm run dev
```

### Start worker:
```bash
cd workers && python worker.py
```

## Code Style
- Go: stdlib + Gin + GORM, no unused imports
- TypeScript/React: strict types, no `any`, functional components
- Python: type hints, f-strings, proper logging

## API Endpoints
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `GET/POST/PATCH/DELETE /api/v1/projects` - Project CRUD
- `GET/POST/DELETE /api/v1/projects/:id/clips` - Media clips
- `PUT /api/v1/projects/:id/dag` - Update operation DAG
- `POST /api/v1/upload/presigned-url` - Get upload URL
- `POST /api/v1/jobs` - Submit job
- `GET /api/v1/jobs/:jobId` - Job status
- `POST /api/v1/nlp/parse` - Parse NL command
- `WS /ws/jobs/:jobId` - Job progress WebSocket
