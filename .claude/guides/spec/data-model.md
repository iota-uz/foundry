# Data Model: [Feature Title]

**Status:** Draft

## Entity Relationships

```
[Entity A] 1──* [Entity B]
[Entity B] *──1 [Entity C]
```

## Tables

<!-- All tables include tenant_id for multi-tenant isolation -->

### [table_name]

```sql
CREATE TABLE [table_name] (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_[table]_tenant ON [table_name](tenant_id);
CREATE INDEX idx_[table]_[field] ON [table_name]([field]);
```

**Fields:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| [field] | [type] | Yes/No | [description] |

## Deletion Strategy

**Approach:** Soft delete / Hard delete

**Rationale:** [why this approach]

**Cascade behavior:** [what happens to related records]

## Migrations

### Migration: [sequence]_[description].sql

```sql
-- Up
[migration SQL]

-- Down
[rollback SQL]
```

## Open Questions

- [TBD] [Unresolved data model questions]
