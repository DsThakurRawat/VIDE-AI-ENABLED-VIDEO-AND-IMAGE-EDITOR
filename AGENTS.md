# VIDE Project Guide

## Overview
VIDE is a blazing-fast, CLI-based AI-native creative suite for video and image editing. It provides a natural language interface to generate non-destructive DAG edits, executing them locally via FFmpeg.

## Architecture
- **Language**: Go (Golang) - Single binary distribution, ultra-fast execution.
- **CLI Framework**: Cobra for command routing.
- **Terminal UI**: Bubble Tea / Lip Gloss for rich, interactive terminal experiences.
- **Execution Engine**: Local FFmpeg processes.
- **Intelligence**: Local/Cloud LLM APIs (OpenAI, Anthropic, Ollama) for NLP-to-DAG planning.

## Key Commands

### Build the CLI:
```bash
go build -o vide main.go
```

### Run an edit (Example):
```bash
./vide edit input.mp4 "make it black and white and trim the first 10 seconds"
```

## Code Style
- Go: idiomatic Go, minimal external dependencies.
- No heavy web frameworks, purely local execution.
- Strict error handling for FFmpeg subprocesses.
