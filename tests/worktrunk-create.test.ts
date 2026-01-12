import { describe, test, expect } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("worktrunk-create tool", () => {
  test("worktrunk-create tool exists", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
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
    const { WorkTrunkPlugin } = await import("../index.ts")
    
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
    expect(commandStr).toContain("feature/test")
    expect(commandStr).not.toContain("--base")
  })

  test("worktrunk-create creates stacked branch with base=@", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
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
    expect(commandStr).toContain("--base")
    expect(commandStr).toContain("@")
  })

  test("worktrunk-create creates branch with custom base", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
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
    expect(commandStr).toContain("--base")
    expect(commandStr).toContain("feature/part1")
  })

  test("worktrunk-create handles errors gracefully", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
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
