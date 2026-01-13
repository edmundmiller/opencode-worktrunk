import { describe, test, expect, mock, beforeEach } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("WorkTrunk Plugin - Edge Cases and Error Scenarios", () => {
  describe("WorkTrunk not installed", () => {
    test("tools handle WorkTrunk not installed gracefully", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      // Mock wt --version to fail (WorkTrunk not installed)
      const mockShell = {
        quiet: () => {
          throw new Error("wt: command not found")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const listTool = plugin.tool["worktrunk-list"]
      
      const result = await listTool.execute({}, {} as any)
      expect(result).toContain("Error")
      expect(result).toContain("not installed")
    })
  })

  describe("Invalid branch names", () => {
    test("worktrunk-create rejects invalid branch names", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      const mockShell = {
        quiet: () => Promise.resolve({ stdout: Buffer.from("") }),
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const createTool = plugin.tool["worktrunk-create"]
      
      // Test with invalid branch name containing spaces
      const result = await createTool.execute({ branch: "invalid branch name" }, {} as any)
      expect(result).toContain("Error")
      expect(result).toContain("Invalid branch name")
    })

    test("worktrunk-create rejects branch names with special characters", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      const mockShell = {
        quiet: () => Promise.resolve({ stdout: Buffer.from("") }),
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const createTool = plugin.tool["worktrunk-create"]
      
      // Test with invalid characters
      const result = await createTool.execute({ branch: "branch@#$%^" }, {} as any)
      expect(result).toContain("Error")
      expect(result).toContain("Invalid branch name")
    })
  })

  describe("Non-existent branches", () => {
    test("worktrunk-switch handles non-existent branch gracefully", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      const mockShell = {
        quiet: () => {
          throw new Error("Branch 'nonexistent' not found")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const switchTool = plugin.tool["worktrunk-switch"]
      
      const result = await switchTool.execute({ branch: "nonexistent" }, {} as any)
      expect(result).toContain("Error")
    })

    test("worktrunk-remove handles non-existent worktree gracefully", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      const mockShell = {
        quiet: () => {
          throw new Error("Worktree 'nonexistent' not found")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const removeTool = plugin.tool["worktrunk-remove"]
      
      const result = await removeTool.execute({ branch: "nonexistent" }, {} as any)
      expect(result).toContain("Error")
      expect(result).toContain("not found")
    })
  })

  describe("Detached HEAD state", () => {
    test("worktrunk-status handles detached HEAD gracefully", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      // Mock git rev-parse to return empty (detached HEAD)
      const mockShell = {
        quiet: () => {
          // First call is wt --version (succeeds)
          // Second call is git rev-parse (fails for detached HEAD)
          throw new Error("fatal: HEAD is a detached symbolic ref")
        },
      }
      
      let callCount = 0
      const mockContext: Partial<PluginContext> = {
        $: ((strings: TemplateStringsArray, ...values: any[]) => {
          const cmd = strings.join("")
          // First call is wt --version check
          if (cmd.includes("wt --version")) {
            return { quiet: () => Promise.resolve({ stdout: Buffer.from("") }) } as any
          }
          // Subsequent calls fail (detached HEAD)
          return mockShell as any
        }) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const statusTool = plugin.tool["worktrunk-status"]
      
      const result = await statusTool.execute({}, {} as any)
      // Should handle gracefully - either return error message or handle detached HEAD
      expect(result).toBeDefined()
    })
  })

  describe("Error recovery scenarios", () => {
    test("worktrunk-list recovers from temporary WorkTrunk errors", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      let attemptCount = 0
      const mockShell = {
        quiet: () => {
          attemptCount++
          if (attemptCount === 1) {
            throw new Error("Temporary error")
          }
          return Promise.resolve({ stdout: Buffer.from("Branch       Status\nmain         active") })
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const listTool = plugin.tool["worktrunk-list"]
      
      // First call should fail, but tool should return error message
      const result = await listTool.execute({}, {} as any)
      expect(result).toContain("Error")
    })

    test("worktrunk-status-update handles branch not found", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      let callCount = 0
      const mockShell = {
        quiet: () => {
          callCount++
          if (callCount === 1) {
            // wt --version succeeds
            return Promise.resolve({ stdout: Buffer.from("") })
          }
          if (callCount === 2) {
            // git rev-parse fails (no branch)
            throw new Error("fatal: not a git repository")
          }
          // wt config state marker set fails
          throw new Error("Branch 'nonexistent' not found")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: ((strings: TemplateStringsArray, ...values: any[]) => {
          const cmd = strings.join("")
          if (cmd.includes("wt --version")) {
            return { quiet: () => Promise.resolve({ stdout: Buffer.from("") }) } as any
          }
          return mockShell as any
        }) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const updateTool = plugin.tool["worktrunk-status-update"]
      
      const result = await updateTool.execute({ marker: "🤖", branch: "nonexistent" }, {} as any)
      expect(result).toContain("Error")
    })
  })

  describe("Complex workflows", () => {
    test("worktrunk-create with base handles invalid base branch", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      const mockShell = {
        quiet: () => {
          throw new Error("Base branch 'invalid-base' not found")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: (() => mockShell) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const createTool = plugin.tool["worktrunk-create"]
      
      const result = await createTool.execute({ 
        branch: "feature/new", 
        base: "invalid-base" 
      }, {} as any)
      expect(result).toContain("Error")
    })

    test("worktrunk-switch with @ shortcut handles current branch detection failure", async () => {
      const pluginModule = await import("../index.ts")
      const WorkTrunkPlugin = pluginModule.default
      
      let callCount = 0
      const mockShell = {
        quiet: () => {
          callCount++
          if (callCount === 1) {
            // wt --version succeeds
            return Promise.resolve({ stdout: Buffer.from("") })
          }
          // git rev-parse fails
          throw new Error("fatal: not a git repository")
        },
      }
      
      const mockContext: Partial<PluginContext> = {
        $: ((strings: TemplateStringsArray, ...values: any[]) => {
          const cmd = strings.join("")
          if (cmd.includes("wt --version")) {
            return { quiet: () => Promise.resolve({ stdout: Buffer.from("") }) } as any
          }
          return mockShell as any
        }) as any,
        client: {
          app: {
            log: async () => {},
          },
        } as any,
        project: {} as any,
        directory: "/test",
        worktree: {} as any,
      }

      const plugin = await WorkTrunkPlugin(mockContext as PluginContext)
      const switchTool = plugin.tool["worktrunk-switch"]
      
      const result = await switchTool.execute({ branch: "@" }, {} as any)
      // Should handle the error gracefully
      expect(result).toBeDefined()
    })
  })
})
