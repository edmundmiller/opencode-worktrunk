import { describe, test, expect } from "bun:test"
import type { PluginContext } from "@opencode-ai/plugin"

describe("worktrunk-list CI monitoring", () => {
  test("worktrunk-list supports --full flag", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("Branch       Status        CI\nmain         active        ✓") }),
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
    const listTool = plugin.tool["worktrunk-list"]
    
    const result = await listTool.execute({ full: true }, {} as any)
    expect(result).toBeDefined()
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--full")
  })

  test("worktrunk-list supports --branches flag", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ stdout: Buffer.from("All branches listed") }),
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
    const listTool = plugin.tool["worktrunk-list"]
    
    const result = await listTool.execute({ branches: true }, {} as any)
    expect(result).toBeDefined()
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--branches")
  })

  test("worktrunk-list supports --full --branches together", async () => {
    const pluginModule = await import("../index.ts")
    const WorkTrunkPlugin = pluginModule.default
    
    let capturedCommand: string[] = []
    const mockContext: Partial<PluginContext> = {
      $: ((strings: TemplateStringsArray, ...values: any[]) => {
        capturedCommand = [...strings.flatMap((s, i) => [s, values[i] || ""])].filter(Boolean)
        return {
          quiet: () => Promise.resolve({ 
            stdout: Buffer.from(JSON.stringify([{ branch: "main", ci_status: "passing" }]))
          }),
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
    const listTool = plugin.tool["worktrunk-list"]
    
    const result = await listTool.execute({ full: true, branches: true, format: "json" }, {} as any)
    expect(result).toBeDefined()
    const commandStr = capturedCommand.join(" ")
    expect(commandStr).toContain("--full")
    expect(commandStr).toContain("--branches")
    expect(commandStr).toContain("--format=json")
  })
})
