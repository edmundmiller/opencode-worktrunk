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
const plugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  let currentBranch: string | null = null
  let statusTimer: ReturnType<typeof setTimeout> | null = null
  let branchCheckInterval: ReturnType<typeof setInterval> | null = null
  let lastKnownBranch: string | null = null

  // Check if WorkTrunk is installed
  const isWorkTrunkInstalled = async (): Promise<boolean> => {
    try {
      await $`wt --version`.quiet()
      return true
    } catch {
      return false
    }
  }

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
    // Always refresh branch before setting marker to handle external changes
    if (!currentBranch) {
      currentBranch = await getCurrentBranch()
      lastKnownBranch = currentBranch
    } else {
      // Quick check if branch changed
      const current = await getCurrentBranch()
      if (current !== currentBranch && current !== null) {
        currentBranch = current
        lastKnownBranch = current
      }
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

  // Debounced status update with improved debouncing strategy
  const updateStatus = (marker: string | null) => {
    if (statusTimer) {
      clearTimeout(statusTimer)
    }
    // Use shorter debounce for status changes (200ms) to be more responsive
    // but still batch rapid status changes
    statusTimer = setTimeout(() => {
      setStatusMarker(marker)
    }, 200) // Debounce by 200ms for better responsiveness
  }

  // Check for branch changes that occur outside the plugin
  const checkBranchChange = async () => {
    const newBranch = await getCurrentBranch()
    if (newBranch !== lastKnownBranch && newBranch !== null) {
      // Branch changed externally - update tracking
      currentBranch = newBranch
      lastKnownBranch = newBranch
      await client.app.log({
        service: "opencode-worktrunk",
        level: "info",
        message: `Detected branch change: ${newBranch}`,
      })
    }
  }

  // Initialize - detect branch on startup
  currentBranch = await getCurrentBranch()
  lastKnownBranch = currentBranch

  // Set up periodic branch checking to detect external changes
  // Check every 2 seconds for branch changes (e.g., manual git checkout)
  if (currentBranch) {
    branchCheckInterval = setInterval(() => {
      checkBranchChange().catch(() => {
        // Silently handle errors in background check
      })
    }, 2000)
  }

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
        description: "List all WorkTrunk worktrees with their status. Supports JSON format for programmatic access. Use --full --branches to show PR/CI status across all branches including those without worktrees.",
        args: {
          format: tool.schema.string().optional().describe("Output format: 'text' (default) or 'json' for structured output"),
          full: tool.schema.boolean().optional().describe("Show full details including PR/CI status"),
          branches: tool.schema.boolean().optional().describe("Include branches without worktrees (useful with --full for CI monitoring)"),
        },
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          try {
            const format = args.format || "text"
            const parts: string[] = []
            
            if (format === "json") {
              parts.push("--format=json")
            }
            if (args.full) {
              parts.push("--full")
            }
            if (args.branches) {
              parts.push("--branches")
            }
            
            const flags = parts.length > 0 ? ` ${parts.join(" ")}` : ""
            const result = await $`wt list${flags}`.quiet()
            return result.stdout.toString()
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Error running 'wt list': ${errorMsg}\n\nTroubleshooting:\n- Ensure WorkTrunk is installed: wt --version\n- Check you're in a git repository: git rev-parse --git-dir\n- Verify WorkTrunk is initialized: wt list`
          }
        },
      }),

      "worktrunk-switch": tool({
        description: "Switch to a different WorkTrunk worktree/branch. Supports shortcuts: '@' for current branch, '-' for previous worktree.",
        args: {
          branch: tool.schema.string().describe("Branch name to switch to, or '@' for current branch, or '-' for previous worktree"),
        },
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          try {
            const result = await $`wt switch ${args.branch}`.quiet()
            // Update currentBranch if not using shortcuts
            if (args.branch !== "@" && args.branch !== "-") {
              currentBranch = args.branch
              lastKnownBranch = args.branch
            } else {
              // For shortcuts, refresh current branch after switch
              currentBranch = await getCurrentBranch()
              lastKnownBranch = currentBranch
            }
            updateStatus("💬")
            return `Switched to branch: ${args.branch}\n${result.stdout.toString()}`
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Error switching to branch '${args.branch}': ${errorMsg}\n\nTroubleshooting:\n- Ensure the branch exists: wt list\n- Check branch name spelling\n- Verify you're in a WorkTrunk-managed repository`
          }
        },
      }),

      "worktrunk-status": tool({
        description: "Get current WorkTrunk status for the active branch",
        args: {},
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          try {
            // Always refresh branch to handle external changes
            currentBranch = await getCurrentBranch()
            lastKnownBranch = currentBranch
            
            if (!currentBranch) {
              return "Not in a git repository or no branch detected.\n\nTroubleshooting:\n- Ensure you're in a git repository: git rev-parse --git-dir\n- Check you're on a branch (not detached HEAD): git branch"
            }

            const result = await $`wt list --branch ${currentBranch}`.quiet()
            return result.stdout.toString() || `Current branch: ${currentBranch}`
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Error getting WorkTrunk status: ${errorMsg}`
          }
        },
      }),

      "worktrunk-create": tool({
        description: "Create a new WorkTrunk worktree for a branch. Supports stacked branches with --base=@ to branch from current HEAD. Supports shortcuts: '@' for current branch.",
        args: {
          branch: tool.schema.string().describe("Branch name to create worktree for, or '@' for current branch"),
          base: tool.schema.string().optional().describe("Base branch or commit to branch from. Use '@' to branch from current HEAD (stacked branches)."),
        },
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          // Validate branch name
          if (args.branch && !/^[@\w\/\-\.]+$/.test(args.branch) && args.branch !== "@") {
            return `Error: Invalid branch name '${args.branch}'. Branch names should only contain letters, numbers, slashes, hyphens, dots, or '@' for current branch.`
          }
          
          try {
            if (args.base) {
              const result = await $`wt switch --create ${args.branch} --base=${args.base}`.quiet()
              currentBranch = args.branch
              lastKnownBranch = args.branch
              updateStatus("💬")
              const baseInfo = args.base === "@" ? "current HEAD" : args.base
              return `Created and switched to branch: ${args.branch} (from ${baseInfo})\n${result.stdout.toString()}`
            } else {
              const result = await $`wt switch --create ${args.branch}`.quiet()
              currentBranch = args.branch
              lastKnownBranch = args.branch
              updateStatus("💬")
              return `Created and switched to branch: ${args.branch}\n${result.stdout.toString()}`
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes("already exists")) {
              return `Error: Branch '${args.branch}' already exists. Use worktrunk-switch to switch to it, or choose a different name.`
            }
            return `Error creating worktree for branch '${args.branch}': ${errorMsg}`
          }
        },
      }),

      "worktrunk-remove": tool({
        description: "Remove a WorkTrunk worktree. Supports shortcuts: '@' for current worktree.",
        args: {
          branch: tool.schema.string().describe("Branch name or worktree to remove, or '@' for current worktree"),
        },
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          try {
            const result = await $`wt remove ${args.branch}`.quiet()
            // If removing current worktree, clear currentBranch and refresh
            if (args.branch === "@" || args.branch === currentBranch) {
              currentBranch = null
              lastKnownBranch = null
              // Refresh to see if we're still in a repo
              const newBranch = await getCurrentBranch()
              if (newBranch) {
                currentBranch = newBranch
                lastKnownBranch = newBranch
              }
            }
            return `Removed worktree: ${args.branch}\n${result.stdout.toString()}`
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
              return `Error: Worktree '${args.branch}' not found. Use 'worktrunk-list' to see available worktrees.`
            }
            return `Error removing worktree '${args.branch}': ${errorMsg}`
          }
        },
      }),

      "worktrunk-default-branch": tool({
        description: "Get the default branch name dynamically. Works regardless of whether default is 'main' or 'master', enabling scripts to work on any repo.",
        args: {},
        async execute(args, ctx) {
          if (!(await isWorkTrunkInstalled())) {
            return "Error: WorkTrunk is not installed. Please install it from https://worktrunk.dev/install"
          }
          
          try {
            const result = await $`wt config state default-branch`.quiet()
            const branch = result.stdout.toString().trim()
            return branch || "Unable to determine default branch. WorkTrunk may not be initialized in this repository."
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            return `Error getting default branch: ${errorMsg}\n\nTroubleshooting:\n- Ensure WorkTrunk is initialized: wt list\n- Check repository configuration: wt config state`
          }
        },
      }),
    },
  }
}

export default plugin
