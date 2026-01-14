import { describe, test, expect } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("worktrunk-create tool", () => {
  test("worktrunk-create tool exists", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.resolve({ stdout: Buffer.from("Created worktree") }),
      })) as any,
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
    expect(plugin.tool["worktrunk-create"]).toBeDefined()
  })

  test("worktrunk-create creates branch without base", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Created worktree") }),
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
    
    const result = await createTool.execute({ branch: "feature/test" }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("feature/test")
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("wt switch")
    expect(commandStr).toContain("--create")
    expect(commandStr).toContain("--yes")
    expect(commandStr).toContain("feature/test")
    expect(commandStr).not.toContain("--base")
    expect(commandStr).not.toContain("--no-verify")
  })

  test("worktrunk-create creates stacked branch with base=@", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Created worktree") }),
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
    
    const result = await createTool.execute({ branch: "feature/part2", base: "@" }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("feature/part2")
    expect(result).toContain("current HEAD")
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--yes")
    expect(commandStr).toContain("--base")
    expect(commandStr).toContain("@")
    expect(commandStr).not.toContain("--no-verify")
  })

  test("worktrunk-create creates branch with custom base", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Created worktree") }),
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
    
    const result = await createTool.execute({ branch: "feature/part2", base: "feature/part1" }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("feature/part2")
    expect(result).toContain("feature/part1")
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--yes")
    expect(commandStr).toContain("--base")
    expect(commandStr).toContain("feature/part1")
    expect(commandStr).not.toContain("--no-verify")
  })

  test("worktrunk-create with skipHooks adds --no-verify flag", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Created worktree") }),
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
    
    const result = await createTool.execute({ branch: "feature/test", skipHooks: true }, {} as any)
    expect(result).toBeDefined()
    expect(result).toContain("feature/test")
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--yes")
    expect(commandStr).toContain("--no-verify")
  })

  test("worktrunk-create handles errors gracefully", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.reject(new Error("Branch already exists")),
      })) as any,
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
    
    const result = await createTool.execute({ branch: "feature/test" }, {} as any)
    expect(result).toContain("Error")
  })
})
