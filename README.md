# OpenCode WorkTrunk Plugin

An OpenCode plugin that integrates with [WorkTrunk](https://worktrunk.dev/) to track session state and update status markers automatically.

## Features

- **Automatic Status Tracking**: Updates WorkTrunk status markers based on OpenCode session state:
  - 🤖 when Claude is working/thinking
  - 💬 when Claude is waiting for input
  - Clears markers when session is idle or errors occur

- **Custom Tools**: Provides OpenCode with WorkTrunk-specific tools:
  - `worktrunk-list` - List all worktrees
  - `worktrunk-switch` - Switch to a different worktree/branch
  - `worktrunk-status` - Get current worktree status
  - `worktrunk-create` - Create a new worktree for a branch

## Installation

This plugin is installed as a local plugin in your OpenCode config directory:

```
~/.config/opencode/plugin/opencode-worktrunk/
```

OpenCode will automatically load it at startup.

## Requirements

- [WorkTrunk](https://worktrunk.dev/) must be installed and configured
- You must be working in a git repository with WorkTrunk initialized

## How It Works

The plugin:

1. **Detects the current git branch** when initialized
2. **Listens to OpenCode session events**:
   - `session.status` - Updates markers based on working/waiting/idle states
   - `session.created` - Sets initial waiting marker
   - `session.idle` - Clears markers
   - `session.error` - Clears markers on errors
3. **Updates WorkTrunk status markers** using `wt config state marker set`
4. **Provides custom tools** that Claude can use to interact with WorkTrunk

## Usage

Once installed, the plugin works automatically. No configuration needed!

### Custom Tools

Claude can use these tools to interact with WorkTrunk:

#### worktrunk-list

List all WorkTrunk worktrees with their status.

```typescript
// Basic listing
worktrunk-list()

// JSON format for programmatic access
worktrunk-list({ format: "json" })

// Full details including CI status
worktrunk-list({ full: true, branches: true })
```

**Use cases:**
- Check what branches have active worktrees
- Monitor CI status across all branches
- Get structured data for scripts (use `format: "json"`)

#### worktrunk-switch

Switch to a different WorkTrunk worktree/branch.

```typescript
// Switch to a specific branch
worktrunk-switch({ branch: "feature/api" })

// Switch to current branch (refresh)
worktrunk-switch({ branch: "@" })

// Switch to previous worktree (quick toggle)
worktrunk-switch({ branch: "-" })
```

**Shortcuts:**
- `"@"` - Current branch (useful for refreshing)
- `"-"` - Previous worktree (quick toggle)

#### worktrunk-status

Get current WorkTrunk status for the active branch.

```typescript
worktrunk-status()
```

Shows status of the current branch's worktree, including any status markers set by the plugin (🤖 working, 💬 waiting).

#### worktrunk-create

Create a new WorkTrunk worktree for a branch.

```typescript
// Create from default branch
worktrunk-create({ branch: "feature/new-feature" })

// Create stacked branch from current HEAD
worktrunk-create({ branch: "feature/part2", base: "@" })

// Create stacked branch from another branch
worktrunk-create({ branch: "feature/part2", base: "feature/part1" })

// Create worktree for current branch
worktrunk-create({ branch: "@" })
```

**Stacked branches:**
- Use `base: "@"` to branch from current HEAD (enables incremental feature development)
- Chain multiple stacked branches: part1 → part2 → part3

#### worktrunk-remove

Remove a WorkTrunk worktree.

```typescript
// Remove specific branch
worktrunk-remove({ branch: "feature/old" })

// Remove current worktree
worktrunk-remove({ branch: "@" })
```

#### worktrunk-default-branch

Get the default branch name dynamically.

```typescript
worktrunk-default-branch()
```

Returns "main" or "master" or other default. Useful for scripts that need to work on any repo (main/master agnostic).

## Status Markers

The plugin automatically sets WorkTrunk status markers that appear in `wt list`:

```
$ wt list
  Branch       Status        HEAD±    main↕  Path                 Remote⇅  Commit    Age   Message
@ main             ^                         .                             a058e792  1d    Initial commit
+ feature-api      ↑ 🤖              ↑1      ../repo.feature-api           95e48b49  1d    Add REST API endpoints
+ review-ui      ? ↑ 💬              ↑1      ../repo.review-ui             46b6a187  1d    Add dashboard component
```

- 🤖 = Claude is working/thinking
- 💬 = Claude is waiting for input

## Common Workflows

### Starting Work on a New Feature

```typescript
// 1. Create a new worktree
worktrunk-create({ branch: "feature/my-feature" })

// 2. Switch to it
worktrunk-switch({ branch: "feature/my-feature" })

// 3. Check status
worktrunk-status()
```

### Working with Stacked Branches

```typescript
// Create part 1
worktrunk-create({ branch: "feature/part1" })
worktrunk-switch({ branch: "feature/part1" })
// ... work on part1 ...

// Create part 2 from part1
worktrunk-create({ branch: "feature/part2", base: "feature/part1" })
worktrunk-switch({ branch: "feature/part2" })
// ... work on part2 ...
```

### Monitoring CI Across Branches

```typescript
// Get CI status for all branches
worktrunk-list({ full: true, branches: true })
```

### Switching Between Worktrees

```typescript
// Switch to main
worktrunk-switch({ branch: "main" })

// Quick toggle to previous
worktrunk-switch({ branch: "-" })
```

## Troubleshooting

### Status markers not appearing

**Symptoms:** Status markers (🤖 or 💬) don't show up in `wt list`

**Solutions:**
1. Ensure WorkTrunk is installed: `wt --version`
2. Check you're in a git repository: `git rev-parse --git-dir`
3. Verify WorkTrunk is initialized: `wt list`
4. Check plugin logs in OpenCode for errors
5. Verify you're on a branch (not detached HEAD): `git branch`
6. Try manually setting a marker: `wt config state marker set "🤖" --branch <branch-name>`

### Plugin not loading

**Symptoms:** Tools like `worktrunk-list` are not available to Claude

**Solutions:**
1. Verify the plugin is in the correct directory:
   - Global: `~/.config/opencode/plugin/opencode-worktrunk/`
   - Project: `.opencode/plugin/opencode-worktrunk/`
2. Check OpenCode logs for plugin loading errors
3. Ensure `package.json` exists and has correct dependencies
4. Restart OpenCode to reload plugins
5. Verify the plugin exports a default export: `export default plugin`

### Tools not working

**Symptoms:** Claude tries to run tools as bash commands instead of using plugin tools

**Solutions:**
1. Verify plugin is loaded: Check OpenCode logs for plugin initialization
2. Ensure tools are properly exported in `index.ts`
3. Check for TypeScript compilation errors
4. Verify OpenCode plugin API version compatibility

### Branch detection issues

**Symptoms:** Status markers appear on wrong branch or don't update

**Solutions:**
1. The plugin checks for branch changes every 2 seconds
2. If you manually switch branches with `git checkout`, markers may take a moment to update
3. Use `worktrunk-switch` instead of `git checkout` for better integration
4. Check plugin logs for branch detection errors

### WorkTrunk command failures

**Symptoms:** Tools return errors about WorkTrunk not being found

**Solutions:**
1. Ensure WorkTrunk is in your PATH: `which wt`
2. Verify WorkTrunk is installed: `wt --version`
3. Check WorkTrunk is initialized in your repo: `wt list`
4. Some operations require WorkTrunk to be properly configured

## Migration Guide

### Upgrading from Previous Versions

If you're upgrading from an older version:

1. **No breaking changes** - All existing tools continue to work
2. **New tools available:**
   - `worktrunk-default-branch` - Get default branch dynamically
   - Enhanced `worktrunk-list` with JSON and CI monitoring support
3. **Improved status tracking:**
   - Better handling of branch changes
   - More reliable marker updates
   - Automatic branch detection refresh

### Tool Usage Patterns

**Pattern 1: Simple branch switching**
```typescript
worktrunk-switch({ branch: "feature/x" })
```

**Pattern 2: Stacked development**
```typescript
// Create and switch in one workflow
worktrunk-create({ branch: "feature/part1" })
worktrunk-switch({ branch: "feature/part1" })
// ... work ...
worktrunk-create({ branch: "feature/part2", base: "feature/part1" })
```

**Pattern 3: CI monitoring**
```typescript
// Get JSON for parsing
const result = worktrunk-list({ format: "json", full: true, branches: true })
// Parse and check CI status
```

## WorkTrunk Hooks Integration

WorkTrunk provides a hooks system that allows running shell commands at key points in the worktree lifecycle. The plugin can be extended to integrate with these hooks for advanced workflows.

### Available Hooks

WorkTrunk supports the following hooks:

- **post-create** - Run after creating a new worktree
- **post-start** - Run when starting work on a worktree
- **post-switch** - Run after switching to a worktree
- **pre-commit** - Run before committing changes
- **pre-merge** - Run before merging a worktree
- **post-merge** - Run after merging a worktree
- **pre-remove** - Run before removing a worktree

### Viewing Configured Hooks

```bash
wt hook show
```

### Potential Integration Use Cases

1. **Automatic PR Creation**: Use `post-create` hook to automatically create PRs for new branches
2. **CI Status Updates**: Use `post-switch` hook to trigger CI runs
3. **Custom Workflow Automation**: Use hooks to run custom scripts at lifecycle events
4. **Status Synchronization**: Use hooks to sync status markers across systems

### Future Enhancements

The plugin could be extended to:
- Automatically configure hooks for common workflows
- Provide tools to manage hooks programmatically
- Integrate hook execution with OpenCode session events
- Provide hook templates for common use cases

For now, hooks can be configured manually using `wt config` and will work alongside the plugin's automatic status tracking.

## Development

The plugin is written in TypeScript and uses the OpenCode plugin API. Key files:

- `index.ts` - Main plugin implementation
- `package.json` - Dependencies and metadata
- `tests/` - Test files for tools
- `evals/` - Evaluation files for testing
- `README.md` - This file

### Running Tests

```bash
npm test
```

### Project Structure

```
opencode-worktrunk/
├── index.ts              # Main plugin implementation
├── package.json          # Dependencies
├── README.md            # Documentation
├── tests/               # Test files
│   ├── worktrunk-list.test.ts
│   ├── worktrunk-switch.test.ts
│   └── ...
└── evals/               # Evaluation files
    ├── tools-basic.eval.json
    └── ...
```

## License

MIT
