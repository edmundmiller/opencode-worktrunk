import { describe, test, expect } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("WorkTrunk shortcuts support", () => {
  test("worktrunk-switch supports @ shortcut", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let switchCommands: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        const command = strings.flatMap((s, i) => [s, values[i] || ""]).filter(Boolean).join(" ")
        if (command.includes("wt switch")) {
          switchCommands.push(command)
        }
        return {
          quiet: () => {
            if (command.includes("git rev-parse")) {
              return Promise.resolve({ stdout: Buffer.from("main") })
            }
            return Promise.resolve({ stdout: Buffer.from("Switched") })
          },
        }
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
    expect(result).toBeDefined()
    expect(result).toContain("@")
    expect(switchCommands.length).toBeGreaterThan(0)
    expect(switchCommands.some(cmd => cmd.includes("@"))).toBe(true)
  })

  test("worktrunk-switch supports - shortcut", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Switched") }),
        }
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
    
    const result = await switchTool.execute({ branch: "-" }, {} as any)
    expect(result).toBeDefined()
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("-")
  })

  test("worktrunk-create supports @ shortcut", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Created") }),
        }
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
    const createTool = plugin.tool["worktrunk-create"]
    
    const result = await createTool.execute({ branch: "@" }, {} as any)
    expect(result).toBeDefined()
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("@")
  })

  test("worktrunk-remove tool exists and supports @ shortcut", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommands: string[][] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        const command = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        capturedCommands.push(command)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Removed") }),
        }
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
    expect(plugin.tool["worktrunk-remove"]).toBeDefined()
    
    const removeTool = plugin.tool["worktrunk-remove"]
    const result = await removeTool.execute({ branch: "@" }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("@")
    // Check that wt remove command was called with @ (may also have git rev-parse calls for branch refresh)
    const allCommands = capturedCommands.map(cmd => cmd.join(" ")).join(" ")
    expect(allCommands).toContain("wt remove")
    expect(allCommands).toContain("@")
  })

  test("worktrunk-remove supports branch name", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Removed") }),
        }
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
    const removeTool = plugin.tool["worktrunk-remove"]
    
    const result = await removeTool.execute({ branch: "feature/test" }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("feature/test")
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("feature/test")
  })
})
