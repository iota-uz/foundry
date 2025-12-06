---
layout: default
title: Home
nav_order: 1
description: "Foundry - CLI-based technical specification constructor with AI-driven Q&A"
permalink: /
---

# Foundry

**CLI-based technical specification constructor with AI-driven Q&A**

Transform vague product ideas into detailed technical specifications through an interactive, workflow-based process. Foundry guides you through three AI-powered phases (CPO → Clarify → CTO) to produce comprehensive documentation including database schemas, API definitions, UI mockups, and more.

---

## Key Features

### 🔄 Workflow-Based Execution
Deterministic step sequences with bounded LLM calls. Complete CPO (product/business), Clarify (ambiguity detection), and CTO (technical) phases with full checkpoint/resume capability.

### 🎯 Topic-Driven Q&A
AI generates conversational questions within predefined topic constraints. Get 15-25 questions per phase across 8 structured topics.

### ⚡ Auto-Generated Artifacts
Schema, API, and Component generators trigger automatically after relevant topics are completed. Get instant DBML schemas, OpenAPI/GraphQL specs, and UI component galleries.

### 🔍 Reverse Engineering
Analyze existing codebases to extract and document specifications. Language-agnostic, AI-driven analysis of your existing projects.

### 📊 Visual-First Approach
Interactive diagrams powered by React Flow. View data flow diagrams, schema visualizations, API documentation, and component galleries.

### 🔄 Git Integration
Branch, commit, push, and pull specifications directly from the UI. Full version control integration for your technical specs.

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/iota-uz/foundry.git
cd foundry

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

### Development

```bash
# Start development server
bun dev

# Visit http://localhost:3000
```

### Your First Specification

1. **Launch Foundry** - Run `bun dev` and open your browser
2. **Start New Spec** - Select "New Specification" mode
3. **CPO Phase** - Answer product and business questions
4. **Clarify Phase** - Automatically detects and resolves ambiguities
5. **CTO Phase** - Define technical architecture and data models
6. **Review Artifacts** - Explore generated schemas, APIs, and UI components
7. **Commit to Git** - Save your specification with version control

---

## Architecture Overview

```
┌─────────────────┐
│   CLI Launcher  │
│   (Bun/npx)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Next.js Web Interface           │
│  ┌──────────┐  ┌──────────────┐    │
│  │ Q&A UI   │  │ Visualizations│    │
│  │ (React)  │  │ (React Flow)  │    │
│  └──────────┘  └──────────────┘    │
└────────┬─────────────────┬──────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  File System    │  │   SQLite     │
│  (YAML specs)   │  │  (History)   │
└─────────────────┘  └──────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Claude AI (Anthropic SDK)       │
│  ┌──────────┐  ┌──────────────┐    │
│  │ CPO      │  │ CTO          │    │
│  │ Workflow │  │ Workflow     │    │
│  └──────────┘  └──────────────┘    │
└─────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Framework** | Next.js 14+ (App Router) |
| **UI Library** | React 18+ |
| **Styling** | Tailwind CSS v4 + Headless UI |
| **State Management** | Zustand |
| **AI Integration** | Claude Agent SDK (Anthropic) |
| **Diagrams** | React Flow |
| **API Docs** | Scalar |
| **Database** | SQLite (better-sqlite3) |
| **File Format** | YAML (specifications) |

---

## Documentation

### Getting Started
- [Installation Guide](./getting-started/) - Setup and configuration
- [First Project Tutorial](./getting-started/) - Build your first spec

### Core Concepts
- [Workflow Phases](./guides/) - Understanding CPO, Clarify, and CTO
- [Artifacts](./guides/) - Working with generated schemas and APIs
- [Reverse Engineering](./guides/) - Analyzing existing codebases

### Technical Reference
- [Full Specification](./specification/) - Complete technical documentation
- [API Schema](./specification/api-schema.html) - REST API endpoints
- [Data Model](./specification/data-model.html) - File structure and database
- [Features](./specification/features/) - Feature documentation

### Research
- [Claude Agent SDK](./specification/research/claude-agent-sdk.html) - AI integration patterns
- [React Flow](./specification/research/react-flow.html) - Diagram implementation
- [Spec-Driven Development](./specification/research/spec-driven-development.html) - Methodology

---

## Use Cases

### 📋 New Project Specification
Starting a new project? Define your entire system architecture through guided Q&A. Get database schemas, API contracts, and UI component specs in under an hour.

### 📚 Documentation for Legacy Code
Inherited an undocumented codebase? Reverse-engineer it into a structured specification with AI assistance. Extract schemas, APIs, and component patterns automatically.

### ✨ Feature Addition
Adding a new feature to an existing project? See how it integrates with your current architecture, view dependency graphs, and maintain consistency.

---

## Target Users

**Tech Leads & Architects** with 5+ years of experience who:
- Define technical direction for projects
- Need consistent specification formats
- Value efficiency over hand-holding
- Work on multiple projects simultaneously

---

## Key Differentiators

- **Visual-first approach** with interactive diagrams
- **Automatic ambiguity detection** via Clarify workflow
- **Project constitution** for consistent AI decisions
- **Event-driven hooks** for automated validation
- **Lessons learned** feedback loop
- **Step-level retry** without restarting entire workflows

---

## Contributing

Foundry is open source. Contributions are welcome!

See the [GitHub repository](https://github.com/iota-uz/foundry) for more information.

---

## License

MIT License - see LICENSE file for details

---

## Links

- [GitHub Repository](https://github.com/iota-uz/foundry)
- [Issues & Bug Reports](https://github.com/iota-uz/foundry/issues)
- [Full Specification](./specification/)

---

**Ready to build better specifications?** [Get Started →](./getting-started/)
