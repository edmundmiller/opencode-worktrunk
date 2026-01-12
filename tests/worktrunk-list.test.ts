import { describe, test, expect, mock, beforeEach } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

// Mock the plugin module
const mockShell = {
  quiet: () => Promise.resolve({ stdout: Buffer.from("test output") }),
}

describe("worktrunk-list tool", () => {
  test("worktrunk-list tool exists and has correct description", async () => {
    // This is a smoke test - verify the tool is properly exported
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockContext: Partial<PluginContext> = {
      $: mockShell as any,
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
    expect(plugin.tool).toBeDefined()
    expect(plugin.tool["worktrunk-list"]).toBeDefined()
  })

  test("worktrunk-list supports text format (default)", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    let capturedCommand: string[] = []
    const mockShell = {
      quiet: () => {
        return Promise.resolve({ stdout: Buffer.from("Branch       Status\nmain         active") })
      },
    }
    
    // We can't easily mock the shell command, so this test verifies
    // the tool structure accepts the format parameter
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
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
    const listTool = plugin.tool["worktrunk-list"]
    
    // Test with default (text) format
    const result = await listTool.execute({}, {} as any)
    expect(result).toBeDefined()
    expect(typeof result).toBe("string")
  })

  test("worktrunk-list supports json format", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    let capturedCommand: string[] = []
    const mockShell = {
      quiet: () => {
        return Promise.resolve({ 
          stdout: Buffer.from(JSON.stringify([{ branch: "main", status: "active" }]))
        })
      },
    }
    
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
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
    const listTool = plugin.tool["worktrunk-list"]
    
    // Test with json format
    const result = await listTool.execute({ format: "json" }, {} as any)
    expect(result).toBeDefined()
    expect(typeof result).toBe("string")
    
    // Verify it's valid JSON
    const parsed = JSON.parse(result as string)
    expect(Array.isArray(parsed) || typeof parsed === "object").toBe(true)
  })

  test("worktrunk-list handles errors gracefully", async () => {
    const { WorkTrunkPlugin } = await import("../index.ts")
    
    const mockShell = {
      quiet: () => {
        throw new Error("wt command not found")
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
  })
})
