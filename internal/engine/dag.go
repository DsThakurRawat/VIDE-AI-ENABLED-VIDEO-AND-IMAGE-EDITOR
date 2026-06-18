package engine

// DAG represents a Directed Acyclic Graph of video/image edit operations.
// The LLM will output a structure like this, and the engine will translate
// it into FFmpeg commands.
type DAG struct {
	Operations []Operation
}

type Operation struct {
	ID     string
	Type   string // e.g., "trim", "grayscale", "crop"
	Inputs []string
	Params map[string]string
}
