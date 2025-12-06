---
layout: default
title: UX Design
nav_order: 8
---

# UX Design

**Status:** Draft

## Design Principles

1. **Dark-first:** Optimized for long working sessions
2. **Information density:** Tech leads want data, not padding
3. **Keyboard-friendly:** Power users prefer shortcuts
4. **Progressive disclosure:** Show details on demand

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  Logo   │ Project: My SaaS App ▼  │  ⌘K Search  │  ↩ Undo │  Git: main │
├─────────┼───────────────────────────────────────────────────────────┤
│         │                                                               │
│ Sidebar │                     Main Content Area                         │
│         │                                                               │
│ ┌─────┐ │  ┌─────────────────────────────────────────────────────────┐ │
│ │Dash │ │  │                                                         │ │
│ │board│ │  │                                                         │ │
│ ├─────┤ │  │                                                         │ │
│ │Mods │ │  │                                                         │ │
│ │ ▼   │ │  │                                                         │ │
│ │ Auth│ │  │                                                         │ │
│ │ Pay │ │  │                                                         │ │
│ ├─────┤ │  │                                                         │ │
│ │Viz  │ │  └─────────────────────────────────────────────────────────┘ │
│ ├─────┤ │                                                               │
│ │UI   │ │  ┌─────────────────────────────────────────────────────────┐ │
│ │Lib  │ │  │              AI Chat / Q&A Panel (collapsible)          │ │
│ ├─────┤ │  └─────────────────────────────────────────────────────────┘ │
│ │Git  │ │                                                               │
│ └─────┘ │                                                               │
└─────────┴───────────────────────────────────────────────────────────────┘
```

## Navigation Structure

### Sidebar (240px, collapsible to 60px)

1. **Dashboard** - Project overview, stats, recent activity
2. **Modules** - Expandable tree of modules → features
3. **Visualizations** - Link to tabbed visualization view
4. **UI Library** - Link to component gallery
5. **Git** - Collapsible git operations panel

### Breadcrumbs

Always visible below top bar:
`Project > Module > Feature` with clickable segments

## Keyboard Shortcuts

**Leader Key Pattern:** `Cmd+K` (or `Ctrl+K` on Windows/Linux) as prefix to avoid browser conflicts.

| Action | Shortcut | Notes |
|--------|----------|-------|
| Command Palette | `Cmd+K` | Opens command palette / acts as leader |
| Save | `Cmd+K, S` | Save current artifact |
| Undo | `Cmd+K, Z` | Undo last action |
| Redo | `Cmd+K, Y` | Redo last undone action |
| Search | `Cmd+K, F` | Global search |
| New Feature | `Cmd+K, N` | Create new feature |
| Toggle Sidebar | `Cmd+K, B` | Collapse/expand sidebar |
| Toggle AI Panel | `Cmd+K, A` | Show/hide AI Q&A panel |
| Decision Journal | `Cmd+K, J` | Open decision journal timeline |
| Toggle Preview | `Cmd+K, P` | Toggle live spec preview panel |

## Color Palette (Dark Theme)

```
Background:
  --bg-primary: #0f0f0f        // Main background
  --bg-secondary: #1a1a1a      // Cards, panels
  --bg-tertiary: #262626       // Hover states

Text:
  --text-primary: #ffffff      // Main text
  --text-secondary: #a3a3a3    // Muted text
  --text-tertiary: #737373     // Disabled text

Accent:
  --accent-primary: #3b82f6    // Blue - primary actions
  --accent-success: #22c55e    // Green - success states
  --accent-warning: #f59e0b    // Amber - warnings
  --accent-error: #ef4444      // Red - errors

Border:
  --border-default: #333333    // Default borders
  --border-focus: #3b82f6      // Focus rings
```

## Responsive Behavior

**Minimum viewport:** 1024px width (desktop-first, no mobile support)

**Breakpoints:**
- 1024px - 1280px: Collapsed sidebar by default
- 1280px+: Full sidebar visible

**Panel priorities:**
1. Main content (always visible)
2. Sidebar (collapsible)
3. AI panel (collapsible)
4. Git panel (collapsible)

## Interaction Patterns

### Question Types

**Single Choice:**
```
○ Option A
● Option B  ← selected (filled circle)
○ Option C
```

**Multiple Choice:**
```
☐ Option A
☑ Option B  ← selected (checkbox)
☑ Option C  ← selected
☐ Option D
```

### States

**Loading:**
- Skeleton loaders for content areas
- Spinner with message for AI operations
- Progress bar for codebase analysis

**Empty:**
- Illustrated empty states with clear CTA
- "No features yet. [+ Add Feature]"

**Error:**
- Red banner at top of affected area
- Clear error message + retry button
- Link to troubleshooting if applicable

**Success:**
- Green toast notification (auto-dismiss 3s)
- Subtle highlight on updated content

### Toast Notifications

- Position: Bottom-right corner
- Auto-dismiss: 3 seconds (success), 5 seconds (error)
- Manual dismiss: Click X or swipe
- Stack: Up to 3 visible, queue additional

### Progress Indicators

- **Determinate:** Show progress bar with percentage when duration is known
- **Indeterminate:** Spinner with message for unknown duration
- **Streaming:** Show incremental results as they arrive (RE mode)

### Unsaved Changes

- Small dot indicator next to artifact name in tab/title
- No blocking dialogs - changes are frequent
- Prompt on browser close if unsaved changes exist

## Form Behavior

### Validation

- **Timing:** On submit only (not on blur or change)
- **Display:** Inline error messages below fields
- **Focus:** Auto-focus first error field

### Auto-Save

- Debounced auto-save (2 second delay after last change)
- Visual indicator: "Saving..." → "Saved"
- Manual save always available via `Cmd+K, S`
