package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var editCmd = &cobra.Command{
	Use:   "edit [file] [prompt]",
	Short: "Edit a video using a natural language prompt",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		file := args[0]
		prompt := args[1]
		
		fmt.Printf("Initializing VIDE agent...\n")
		fmt.Printf("File: %s\n", file)
		fmt.Printf("Prompt: %q\n", prompt)
		
		// TODO: Call internal/llm to parse prompt into a DAG
		// TODO: Pass DAG to internal/ui to render the plan
		// TODO: Call internal/engine to execute FFmpeg
		
		fmt.Println("Edit planned. (Execution not yet implemented)")
	},
}

func init() {
	rootCmd.AddCommand(editCmd)
}
