# Foundry

Visual workflow builder for AI-powered software development pipelines. Build, visualize, and execute multi-step AI workflows with a drag-and-drop interface.

**[Documentation](https://iota-uz.github.io/foundry/)** · **[Getting Started](#getting-started)** · **[Architecture](#architecture)**

## Overview

Foundry provides a visual canvas for building AI-driven automation workflows. Powered by React Flow for the UI and a finite state machine (FSM) execution engine, it enables developers to create sophisticated multi-step AI pipelines without writing orchestration code.

## Key Features

- **Visual Workflow Builder**: React Flow-based drag-and-drop canvas for node construction
- **Graph Engine**: FSM-based workflow execution with checkpoint/resume
- **Node Library**: Pre-built nodes (Agent, Command, HTTP, LLM, Eval, etc.)
- **Real-Time Execution**: SSE-based live progress monitoring
- **GitHub Integration**: Dispatch workflows via Actions, update GitHub Projects

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Anthropic API key](https://console.anthropic.com/)
- [PostgreSQL](https://www.postgresql.org/) (or use Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/iota-uz/foundry.git
cd foundry

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Database Setup

```bash
# Start PostgreSQL with Docker
docker compose up -d postgres

# Push schema to database
bun db:push
```

### Quick Start

```bash
# Start the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to start building workflows.

### Development

```bash
# Run type checking
bun typecheck

# Lint code
bun lint

# Format code
bun format

# Run tests
bun test
```

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
- **AI Integration**: Claude Agent SDK
- **Visualizations**: React Flow
- **Database**: PostgreSQL + Drizzle ORM
- **Real-Time**: Server-Sent Events (SSE)

For detailed architecture documentation, see [CLAUDE.md](./CLAUDE.md).

## Project Structure

```
foundry/
├── docs/                 # Public documentation (GitHub Pages)
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # React components
│   ├── lib/             # Core libraries (graph, workflow-builder, db)
│   └── store/           # Zustand stores
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Environment Variables

See `.env.example` for available configuration options.

**Required:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `DATABASE_URL` - PostgreSQL connection string

**Optional:**
- `NODE_ENV` - Set to 'development' or 'production'
- `PORT` - Server port (default: 3000)

## Documentation

- **Full Documentation**: Visit [https://iota-uz.github.io/foundry](https://iota-uz.github.io/foundry)
- **Graph Engine**: See `docs/graph/` for FSM execution engine docs
- **Workflow Builder**: See `docs/workflow-builder/` for visual builder docs
- **AI Context**: See `CLAUDE.md` for project context

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
| `bun db:push` | Push schema to database |
| `bun db:studio` | Open Drizzle Studio |

## License

MIT
