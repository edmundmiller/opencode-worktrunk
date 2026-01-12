import { describe, test, expect } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("worktrunk-default-branch tool", () => {
  test("worktrunk-default-branch tool exists", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.resolve({ stdout: Buffer.from("main") }),
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
    expect(plugin.tool["worktrunk-default-branch"]).toBeDefined()
  })

  test("worktrunk-default-branch returns default branch name", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.resolve({ stdout: Buffer.from("main") }),
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
    const defaultBranchTool = plugin.tool["worktrunk-default-branch"]
    
    const result = await defaultBranchTool.execute({}, {} as any)
    expect(result).toBe("main")
  })

  test("worktrunk-default-branch handles master branch", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.resolve({ stdout: Buffer.from("master") }),
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
    const defaultBranchTool = plugin.tool["worktrunk-default-branch"]
    
    const result = await defaultBranchTool.execute({}, {} as any)
    expect(result).toBe("master")
  })

  test("worktrunk-default-branch handles errors gracefully", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.reject(new Error("wt command not found")),
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
    const defaultBranchTool = plugin.tool["worktrunk-default-branch"]
    
    const result = await defaultBranchTool.execute({}, {} as any)
    expect(result).toContain("Error")
  })

  test("worktrunk-default-branch handles empty output", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: (() => ({
        quiet: () => Promise.resolve({ stdout: Buffer.from("") }),
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
    const defaultBranchTool = plugin.tool["worktrunk-default-branch"]
    
    const result = await defaultBranchTool.execute({}, {} as any)
    expect(result).toContain("Unable to determine")
  })
})
