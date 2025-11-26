# File System Sync Research

**Status:** Research Complete
**Last Updated:** 2025-11-25

## Overview

Foundry needs to read/write specification files to the local file system and watch for external changes. This document covers file watching, atomic writes, and Git integration.

## Key Findings

### File Watching Libraries

**Sources:**
- [Chokidar GitHub](https://github.com/paulmillr/chokidar)
- [npm comparison: chokidar vs alternatives](https://npm-compare.com/chokidar,fsevents,gaze,node-watch,watch)

| Library | Weekly Downloads | Cross-Platform | Recommendation |
|---------|------------------|----------------|----------------|
| chokidar | 50M+ | Yes | **Recommended** |
| node-watch | 1M+ | Yes | Lightweight alternative |
| watchpack | 15M+ | Yes | Webpack-focused |
| gaze | 500K | Yes | Older, less maintained |

### Chokidar (Recommended)

**Why Chokidar:**
- Used in ~30 million repositories
- Battle-tested since 2012 (Brunch)
- v4 (Sept 2024): Reduced dependencies from 13 to 1
- Uses native OS APIs (inotify, FSEvents, ReadDirectoryChangesW)
- Low CPU usage (no polling by default)

**Platform-Specific Behavior:**
- **macOS:** Uses FSEvents (native, efficient)
- **Linux:** Uses inotify (native, efficient)
- **Windows:** Uses ReadDirectoryChangesW (native)

**Key Features:**
- Recursive directory watching
- Glob pattern support (v3, removed in v4)
- Event debouncing
- Atomic write detection
- Symlink handling

### Chokidar v4 Changes

**Breaking Changes from v3:**
- Glob support removed (use `picomatch` separately if needed)
- Minimum Node.js version: 14
- ESM/CommonJS dual support

**For Foundry:**
- We watch specific directories (`.foundry/`), not globs
- v4's reduced dependencies is beneficial
- Node 14+ requirement is acceptable

## File Watching Strategy

### What to Watch

```
.foundry/
├── project.yaml        # Watch: Project metadata changes
├── modules/            # Watch: Module additions/deletions
│   └── *.yaml
├── features/           # Watch: Feature changes
│   └── *.yaml
├── schemas/            # Watch: Schema changes
│   └── schema.dbml
├── apis/               # Watch: API spec changes
│   ├── openapi.yaml
│   └── schema.graphql
└── components/         # Watch: Component changes
    └── **/*.html
```

### Event Types to Handle

| Event | Trigger | Action |
|-------|---------|--------|
| `add` | New file created | Load into state |
| `change` | File modified | Reload file, update state |
| `unlink` | File deleted | Remove from state |
| `addDir` | New directory | Update navigation tree |
| `unlinkDir` | Directory deleted | Update navigation tree |

### External Change Detection

**Scenario:** User edits `.foundry/features/login.yaml` in VS Code while Foundry is open.

**Handling Strategy:**
1. Chokidar detects `change` event
2. Compare file mtime with last known mtime
3. If newer, read file content
4. Compare content hash with in-memory state
5. If different:
   - If no unsaved changes in Foundry: auto-reload
   - If unsaved changes: show conflict dialog

### Conflict Resolution Dialog

```
┌─────────────────────────────────────────────┐
│ External Change Detected                    │
├─────────────────────────────────────────────┤
│ File: features/login.yaml                   │
│ Modified by: External editor                │
│                                             │
│ You have unsaved changes in Foundry.        │
│                                             │
│ [Keep Foundry Version]  [Load External]     │
│ [Show Diff]                                 │
└─────────────────────────────────────────────┘
```

## Atomic Writes

### The Problem

Non-atomic writes can cause:
1. **Partial reads:** Watcher triggers before write completes
2. **Data corruption:** Reader sees incomplete file
3. **Race conditions:** Multiple processes writing

### Solution: Write-Rename Pattern

```
1. Write to temporary file: .foundry/features/login.yaml.tmp
2. Sync/flush to disk
3. Rename temp file to target: login.yaml.tmp → login.yaml
4. Rename is atomic on POSIX systems
```

### Implementation Considerations

**POSIX (macOS, Linux):**
- `rename()` is atomic within same filesystem
- Use `fsync()` before rename for durability

**Windows:**
- `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING` is atomic
- Need to handle locked files (antivirus, etc.)

**Chokidar Atomic Detection:**
- Chokidar has `atomic` option for detecting write-rename pattern
- Set `atomic: true` to coalesce rapid events

## Git Integration

### Finding Git Root

**Decision:** .foundry directory is created at Git root.

**Detection Strategy:**
```
1. Start from current working directory
2. Walk up directory tree
3. Look for .git directory
4. If found: that's the project root
5. If not found: current directory is root (non-git project)
```

### Git Status Monitoring

**What to Track:**
- Current branch name
- Ahead/behind counts
- Staged files
- Unstaged changes
- Untracked files
- Conflict markers

**Polling vs Events:**
- Git doesn't have native file watching
- Poll `git status` on:
  - App startup
  - After Foundry saves files
  - Timer (every 30 seconds?)
  - Before showing Git panel

### Conflict Detection

**Pre-Save Check:**
```
1. Run `git status --porcelain`
2. Check for conflict markers (UU, AA, DD, etc.)
3. If conflicts exist, block save and show guide
```

**Conflict States:**
| Marker | Meaning |
|--------|---------|
| UU | Both modified |
| AA | Both added |
| DD | Both deleted |
| AU | Added by us, modified by them |

### Git Operations

| Operation | Command | Notes |
|-----------|---------|-------|
| Status | `git status --porcelain` | Parse output |
| Branch | `git branch --show-current` | Current branch name |
| Branches | `git branch -a` | All branches |
| Checkout | `git checkout <branch>` | Switch branch |
| Pull | `git pull` | May cause conflicts |
| Commit | `git commit -m "message"` | After staging |
| Push | `git push` | May fail if behind |

## Open Questions

### File Locking

**Question:** Should Foundry lock files while editing?

**Options:**
1. **No locking:** Rely on conflict detection
2. **Advisory locks:** Create .lock files
3. **OS locks:** Use flock/lockfile

**Recommendation:** No locking (option 1)
- Simpler implementation
- Users expect to edit files externally
- Conflict detection is sufficient

### Debounce Timing

**Question:** How long to debounce file events?

**Considerations:**
- Too short: Multiple events for single save
- Too long: Sluggish UI updates
- Editors save differently (VS Code atomic, vim temp files)

**Recommendation:** 100-300ms debounce
- Test with common editors
- Make configurable if needed

### Large File Handling

**Question:** What if schema.dbml becomes very large?

**Thresholds to Consider:**
- < 100KB: Read entirely into memory
- 100KB - 1MB: Stream with progress
- > 1MB: Warn user, consider optimization

**Recommendation:** Start simple (full read), add streaming if needed

## Recommendations

### 1. Use Chokidar v4

**Rationale:**
- Industry standard
- Minimal dependencies
- Native performance
- Well-documented

### 2. Implement Write-Rename Pattern

**Rationale:**
- Prevents partial reads
- Works cross-platform
- Chokidar handles atomic detection

### 3. Auto-Reload External Changes (When Safe)

**Rationale:**
- Better UX than always prompting
- Only prompt on actual conflicts
- Users expect live updates

### 4. Poll Git Status (Don't Watch .git)

**Rationale:**
- .git directory changes frequently
- Watching it causes noise
- Polling on save/timer is sufficient

### 5. Block Save on Git Conflicts

**Rationale:**
- Prevents data loss
- Forces user to resolve properly
- Clear UX (not hidden auto-merge)

## Prototype Tasks

1. **Basic Watcher**
   - Watch `.foundry/` directory
   - Log all events
   - Verify cross-platform behavior

2. **Atomic Write**
   - Implement write-rename pattern
   - Test with concurrent reads
   - Verify Windows compatibility

3. **Git Integration**
   - Shell out to git commands
   - Parse status output
   - Display in UI

4. **Conflict Detection**
   - Detect external file changes
   - Compare with in-memory state
   - Show conflict dialog

## Related Resources

- [Chokidar README](https://github.com/paulmillr/chokidar/blob/main/README.md)
- [Node.js fs.watch documentation](https://nodejs.org/api/fs.html#fswatchfilename-options-listener)
- [Git status porcelain format](https://git-scm.com/docs/git-status#_porcelain_format_version_1)
