# API Schema: [Feature Title]

**Status:** Draft

<!-- Include only relevant sections: GraphQL for data APIs, HTMX for UI interactions, or both -->

## HTMX Endpoints

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | /[path] | [purpose] | HTML fragment |
| POST | /[path] | [purpose] | HTML fragment / redirect |

### Endpoint: [name]

**Purpose:** [what this endpoint does]
**Authorization:** [required permissions]
**Request:** [form fields or query params]
**Response:** [HTML fragment description]

## GraphQL Types

```graphql
type [EntityName] {
  id: ID!
  # fields
  createdAt: DateTime!
  updatedAt: DateTime!
}

input [EntityName]Input {
  # input fields
}
```

## GraphQL Queries

```graphql
type Query {
  [entityName](id: ID!): [EntityName]
  [entityNames](filter: [Filter], pagination: Pagination): [EntityName]Connection!
}
```

### Query: [queryName]

**Purpose:** [what this query retrieves]
**Authorization:** [required permissions]

## GraphQL Mutations

```graphql
type Mutation {
  create[EntityName](input: [EntityName]Input!): [EntityName]!
  update[EntityName](id: ID!, input: [EntityName]Input!): [EntityName]!
  delete[EntityName](id: ID!): Boolean!
}
```

### Mutation: [mutationName]

**Purpose:** [what this mutation does]
**Authorization:** [required permissions]
**Validation:** [input validation rules]
**Side Effects:** [events published, notifications sent]

## Error Handling

| Error Code | Condition | Response |
|------------|-----------|----------|
| [code] | [when this occurs] | [error message] |

## Open Questions

- [TBD] [Unresolved API questions]
