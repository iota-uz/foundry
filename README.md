# Foundry

CLI-based technical specification constructor that launches a local web interface for iteratively building and refining software requirements through AI-driven Q&A.

## Overview

Foundry transforms vague product ideas into detailed technical specifications including database schemas, API definitions, UI mockups, and component galleries. It uses a workflow-based three-phase process (CPO → Clarify → CTO) to guide users through comprehensive specification building with AI assistance.

## Key Features

- **Workflow-based Q&A**: Three-phase process with AI-generated conversational questions
- **Visual Artifacts**: Interactive diagrams, data flow visualizations, and component galleries
- **Auto-Generation**: Automatic schema, API, and component generation from answers
- **Reverse Engineering**: Analyze existing codebases to extract specifications
- **Git Integration**: Branch, commit, and push specifications directly from the UI
- **State Persistence**: Full checkpoint/resume capability across sessions

## Getting Started

### Prerequisites

- Bun >= 1.0.0

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables (copy example file)
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

### Development

```bash
# Start development server
bun dev

# Run type checking
bun typecheck

# Lint code
bun lint

# Format code
bun format
```

Visit `http://localhost:3000` to see the application.

### Production

```bash
# Build for production
bun build

# Start production server
bun start
```

## Architecture

Foundry is built with:

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS v4, Headless UI
- **State Management**: Zustand
- **AI Integration**: Anthropic SDK, Claude Agent SDK
- **Visualizations**: React Flow, Scalar API Reference
- **Database**: SQLite (for state and history)
- **Storage**: YAML files (for specifications, Git-friendly)

For detailed architecture documentation, see [CLAUDE.md](./CLAUDE.md).

## Project Structure

```
foundry/
├── .claude/              # AI context and specifications
├── src/
│   └── app/             # Next.js App Router
├── public/              # Static assets
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Environment Variables

See `.env.example` for available configuration options.

**Required:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key

**Optional:**
- `NODE_ENV` - Set to 'development' or 'production'
- `PORT` - Server port (default: 3000)

## Documentation

- **Specifications**: See `.claude/specs/foundry-core/` for full technical specifications
- **AI Context**: See `CLAUDE.md` for project context and AI instructions
- **Architecture**: See `.claude/specs/foundry-core/technical.md` for detailed architecture

## Development Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server with hot reload |
| `bun build` | Create production build |
| `bun start` | Start production server |
| `bun typecheck` | Check TypeScript types |
| `bun lint` | Run ESLint |
| `bun format` | Format code with Prettier |
| `bun test` | Run tests |

## License

MIT
