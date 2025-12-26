# Workflow Execution Architecture

## Context

- **Internal tool deployed to Railway**
- Users provide external service URLs (Supabase, Neon, Upstash, etc.)
- Foundry stores credentials encrypted and injects as env vars

---

## Architecture: Direct Execution on Railway

```
┌─────────────────────────────────────────────────────┐
│                  Railway Project                     │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Foundry      │    │ Worker Service           │   │
│  │ (Next.js)    │───▶│ (scale-to-zero)          │   │
│  │              │    │                          │   │
│  │ Queue +      │◀───│ GraphEngine              │   │
│  │ State + SSE  │    └──────────────────────────┘   │
│  └──────────────┘                                    │
│         │                                            │
│  ┌──────────────┐                                    │
│  │ PostgreSQL   │                                    │
│  └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
         │
         │ User-provided connection URLs (env vars)
         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ User's DB       │  │ User's Redis    │  │ User's APIs     │
│ (Neon/Supabase) │  │ (Upstash)       │  │ (external)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## How It Works

1. **User configures workflow** with environment variables in Foundry UI
2. **User clicks "Run"** → execution queued in Foundry database
3. **Worker service** (on Railway) picks up execution from queue
4. **GraphEngine executes** with injected environment variables
5. **Real-time updates** streamed via SSE to Foundry UI
6. **Results stored** in Foundry database

---

## User Experience

### Configuring Environment Variables

```
┌─────────────────────────────────────────────────────────────┐
│ Workflow Settings                                            │
├─────────────────────────────────────────────────────────────┤
│ Environment Variables                                        │
│ ┌─────────────────────┬──────────────────────────────────┐  │
│ │ DATABASE_URL        │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │  │
│ │ ANTHROPIC_API_KEY   │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │  │
│ │ REDIS_URL           │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │  │
│ │ + Add Variable      │                                  │  │
│ └─────────────────────┴──────────────────────────────────┘  │
│                                                              │
│ Variables are encrypted at rest and injected during         │
│ workflow execution.                                          │
└─────────────────────────────────────────────────────────────┘
```

### Running a Workflow

```
1. User clicks "Run" in Foundry UI
2. Foundry creates execution with status: QUEUED
3. Worker service picks up execution (immediate, no polling)
4. GraphEngine runs with user's env vars injected
5. Live logs stream to Foundry UI via SSE
6. Workflow completes → status: COMPLETED
```

---

## Implementation Components

### 1. Encrypted Secrets Storage

```typescript
// src/lib/db/schema/workflow-secrets.ts
export const workflowSecrets = pgTable('workflow_secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),
  key: text('key').notNull(),           // e.g., "DATABASE_URL"
  encryptedValue: text('encrypted_value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2. Environment Configuration UI

Add to workflow settings:
- Key-value editor for environment variables
- Values encrypted before storage
- "Test Connection" for database URLs (optional)

### 3. Worker Service

Separate Railway service that:
- Connects to same PostgreSQL database
- Polls execution queue (or uses pg_notify for real-time)
- Runs GraphEngine with injected env vars
- Reports status back to database
- Scale-to-zero when idle

```typescript
// services/worker/src/executor.ts
async function executeWorkflow(execution: Execution) {
  // Decrypt and inject environment variables
  const env = await decryptSecrets(execution.workflowId);

  // Run GraphEngine
  const engine = new GraphEngine({
    env: { ...process.env, ...env },
  });

  await engine.run(execution.workflow, {
    onNodeStart: (node) => updateStatus(execution.id, node, 'running'),
    onNodeComplete: (node) => updateStatus(execution.id, node, 'completed'),
    onLog: (log) => appendLog(execution.id, log),
  });
}
```

### 4. Queue Mechanism

Options:
- **Simple**: Poll database every 1-5 seconds
- **Better**: PostgreSQL `pg_notify` for real-time
- **Best**: Redis queue (if already using Redis)

For MVP, database polling is sufficient:

```typescript
// Poll for queued executions
while (true) {
  const execution = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.status, 'QUEUED'))
    .orderBy(workflowExecutions.createdAt)
    .limit(1);

  if (execution) {
    await claimAndExecute(execution);
  } else {
    await sleep(1000); // 1 second poll interval
  }
}
```

---

## Database Schema Changes

### New: Workflow Secrets Table

```sql
CREATE TABLE workflow_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workflow_id, key)
);
```

### Modified: Workflow Executions

```sql
ALTER TABLE workflow_executions ADD COLUMN
  source TEXT DEFAULT 'ui',           -- 'ui' | 'api' | 'schedule'
  worker_id TEXT,                      -- Which worker claimed it
  queued_at TIMESTAMP,
  claimed_at TIMESTAMP;
```

---

## Railway Configuration

### railway.toml (updated)

```toml
[build]
builder = "nixpacks"

# Main Foundry app
[[services]]
name = "foundry"
startCommand = "bun start"

# Worker service
[[services]]
name = "worker"
startCommand = "bun run worker"
healthcheck = { path = "/health", interval = 30 }

# Enable scale-to-zero for worker
[services.worker.scaling]
minInstances = 0
maxInstances = 3
```

### Private Networking

Worker connects to Foundry's PostgreSQL via Railway private network:
- No public internet exposure
- Low latency between services
- Shared database connection

---

## Implementation Plan

### Phase 1: Secrets Infrastructure
1. Create `workflow_secrets` table with Drizzle schema
2. Implement encryption utilities (AES-256-GCM)
3. Create secrets repository (CRUD operations)

### Phase 2: Environment UI
4. Add environment variables section to workflow settings
5. Key-value editor with show/hide values
6. Save encrypted to database

### Phase 3: Worker Service
7. Create `services/worker/` directory
8. Implement queue consumer (database polling)
9. Inject decrypted env vars into GraphEngine
10. Status updates back to database

### Phase 4: Execution Flow
11. "Run" button queues execution
12. Worker picks up and executes
13. SSE streaming for live logs (existing infra)

### Phase 5: Railway Deployment
14. Add worker service to `railway.toml`
15. Configure scale-to-zero
16. Test private networking

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/db/schema/workflow-secrets.ts` | Secrets schema |
| `src/lib/crypto/encryption.ts` | AES-256-GCM encryption |
| `src/lib/db/repositories/secrets.repository.ts` | Secrets CRUD |
| `src/components/workflow-builder/environment-config.tsx` | Env vars UI |
| `src/lib/actions/secrets.ts` | Server actions for secrets |
| `services/worker/` | Worker service root |
| `services/worker/package.json` | Worker dependencies |
| `services/worker/src/index.ts` | Entry point |
| `services/worker/src/queue.ts` | Queue consumer |
| `services/worker/src/executor.ts` | GraphEngine runner |

### Modified Files
| File | Purpose |
|------|---------|
| `src/lib/db/schema/index.ts` | Export secrets schema |
| `src/lib/db/schema/workflow-executions.ts` | Add worker_id, timestamps |
| `src/app/workflows/[id]/page.tsx` | Add settings tab |
| `src/lib/actions/executions.ts` | Queue execution |
| `railway.toml` | Add worker service |

---

## Security Considerations

1. **Encryption at rest**: AES-256-GCM with app-level key
2. **Key management**: Encryption key in Railway environment variables
3. **No logging of secrets**: Env vars never appear in logs
4. **Access control**: Only workflow owner can view/edit secrets
5. **Audit trail**: Log when secrets are accessed (not values)

---

## Decisions Summary

| Question | Decision |
|----------|----------|
| Architecture | Direct execution on Railway (Option C) |
| Dependencies | User-provided external service URLs |
| Secrets storage | Encrypted in database (AES-256-GCM) |
| Queue mechanism | Database polling (MVP), pg_notify later |
| Worker scaling | Scale-to-zero on Railway |

---

## Sources

- [Railway Services](https://docs.railway.com/reference/services)
- [Railway Private Networking](https://docs.railway.com/reference/private-networking)
