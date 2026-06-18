package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "vide",
	Short: "VIDE is an AI-native agentic video editor",
	Long: `VIDE is a CLI tool that uses Natural Language Processing to plan and execute 
non-destructive video and image edits directly in your terminal using FFmpeg.`,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
