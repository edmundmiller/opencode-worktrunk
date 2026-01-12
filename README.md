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

```typescript
// List all worktrees
worktrunk-list()

// Switch to a branch
worktrunk-switch({ branch: "feature/api" })

// Get current status
worktrunk-status()

// Create a new worktree
worktrunk-create({ branch: "feature/new-feature" })
```

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

## Troubleshooting

### Status markers not appearing

1. Ensure WorkTrunk is installed: `wt --version`
2. Check you're in a git repository: `git rev-parse --git-dir`
3. Verify WorkTrunk is initialized: `wt list`
4. Check plugin logs in OpenCode for errors

### Plugin not loading

1. Verify the plugin is in the correct directory:
   - Global: `~/.config/opencode/plugin/opencode-worktrunk/`
   - Project: `.opencode/plugin/opencode-worktrunk/`
2. Check OpenCode logs for plugin loading errors
3. Ensure `package.json` exists and has correct dependencies

## Development

The plugin is written in TypeScript and uses the OpenCode plugin API. Key files:

- `index.ts` - Main plugin implementation
- `package.json` - Dependencies and metadata
- `README.md` - This file

## License

MIT
