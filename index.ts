import { type Plugin, tool } from "@opencode-ai/plugin"

/**
 * OpenCode plugin for WorkTrunk integration
 * 
 * Tracks OpenCode session state and updates WorkTrunk status markers:
 * - 🤖 when Claude is working
 * - 💬 when Claude is waiting for input
 * 
 * Also provides custom tools for WorkTrunk operations.
 */
export const WorkTrunkPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  let currentBranch: string | null = null
  let statusTimer: ReturnType<typeof setTimeout> | null = null

  // Detect current git branch
  const getCurrentBranch = async (): Promise<string | null> => {
    try {
      const result = await $`git rev-parse --abbrev-ref HEAD`.quiet()
      return result.stdout.toString().trim() || null
    } catch {
      return null
    }
  }

  // Set WorkTrunk status marker
  const setStatusMarker = async (marker: string | null) => {
    if (!currentBranch) {
      currentBranch = await getCurrentBranch()
    }
    
    if (!currentBranch) {
      return // Not in a git repo or no branch detected
    }

    try {
      if (marker) {
        await $`wt config state marker set "${marker}" --branch ${currentBranch}`.quiet()
      } else {
        // Clear marker by setting empty
        await $`wt config state marker set "" --branch ${currentBranch}`.quiet()
      }
    } catch (error) {
      // WorkTrunk might not be installed or configured - that's okay
      await client.app.log({
        service: "opencode-worktrunk",
        level: "debug",
        message: `Failed to set status marker: ${error}`,
      })
    }
  }

  // Debounced status update
  const updateStatus = (marker: string | null) => {
    if (statusTimer) {
      clearTimeout(statusTimer)
    }
    statusTimer = setTimeout(() => {
      setStatusMarker(marker)
    }, 500) // Debounce by 500ms
  }

  // Initialize - detect branch on startup
  currentBranch = await getCurrentBranch()

  await client.app.log({
    service: "opencode-worktrunk",
    level: "info",
    message: `WorkTrunk plugin initialized${currentBranch ? ` for branch: ${currentBranch}` : ""}`,
  })

  return {
    // Track session status changes
    event: async ({ event }) => {
      switch (event.type) {
        case "session.status": {
          // event.status contains the current status
          const status = (event as any).status
          if (status === "working" || status === "thinking") {
            updateStatus("🤖")
          } else if (status === "waiting" || status === "idle") {
            updateStatus("💬")
          } else {
            updateStatus(null)
          }
          break
        }

        case "session.created": {
          // Set initial status when session starts
          updateStatus("💬")
          break
        }

        case "session.idle": {
          // Clear marker when session becomes idle
          updateStatus(null)
          break
        }

        case "session.error": {
          // Clear marker on error
          updateStatus(null)
          break
        }
      }
    },

    // Custom tools for WorkTrunk operations
    tool: {
      "worktrunk-list": tool({
        description: "List all WorkTrunk worktrees with their status",
        args: {},
        async execute(args, ctx) {
          try {
            const result = await $`wt list`.quiet()
            return result.stdout.toString()
          } catch (error) {
            return `Error running 'wt list': ${error}`
          }
        },
      }),

      "worktrunk-switch": tool({
        description: "Switch to a different WorkTrunk worktree/branch",
        args: {
          branch: tool.schema.string().describe("Branch name to switch to"),
        },
        async execute(args, ctx) {
          try {
            const result = await $`wt switch ${args.branch}`.quiet()
            currentBranch = args.branch
            updateStatus("💬")
            return `Switched to branch: ${args.branch}\n${result.stdout.toString()}`
          } catch (error) {
            return `Error switching to branch '${args.branch}': ${error}`
          }
        },
      }),

      "worktrunk-status": tool({
        description: "Get current WorkTrunk status for the active branch",
        args: {},
        async execute(args, ctx) {
          try {
            if (!currentBranch) {
              currentBranch = await getCurrentBranch()
            }
            
            if (!currentBranch) {
              return "Not in a git repository or no branch detected"
            }

            const result = await $`wt list --branch ${currentBranch}`.quiet()
            return result.stdout.toString() || `Current branch: ${currentBranch}`
          } catch (error) {
            return `Error getting WorkTrunk status: ${error}`
          }
        },
      }),

      "worktrunk-create": tool({
        description: "Create a new WorkTrunk worktree for a branch",
        args: {
          branch: tool.schema.string().describe("Branch name to create worktree for"),
        },
        async execute(args, ctx) {
          try {
            const result = await $`wt switch --create ${args.branch}`.quiet()
            currentBranch = args.branch
            updateStatus("💬")
            return `Created and switched to branch: ${args.branch}\n${result.stdout.toString()}`
          } catch (error) {
            return `Error creating worktree for branch '${args.branch}': ${error}`
          }
        },
      }),
    },
  }
}
