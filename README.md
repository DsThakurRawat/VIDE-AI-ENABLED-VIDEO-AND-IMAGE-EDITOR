# VIDE - AI-Enabled Video & Image Editor

This is the monorepo for the VIDE project, an AI-native creative suite for video and image editing featuring Natural Language interfaces and non-destructive DAG editing.

## Architecture

- **`gateway/`**: Go API Gateway (Gin) handling auth, rate limiting, and core CRUD.
- **`frontend/`**: Next.js 15 Web App (React 19, Tailwind, Zustand) for the timeline editor UI.
- **`workers/`**: Python 3.12 workers integrating with SAM2, LaMa, DeepFilterNet, and FFmpeg for actual job execution.
- **`docker-compose.yml`**: Local infrastructure containing PostgreSQL, Redis, and MinIO.

## Getting Started

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379), and MinIO (9000).

### 2. Start Gateway

```bash
cd gateway
go run main.go
```

API runs on `http://localhost:8080`.

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Web app runs on `http://localhost:3000`.

### 4. Setup Workers

```bash
cd workers
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python worker.py
```
# VIDE-AI-ENABLED-VIDEO-AND-IMAGE-EDITOR
