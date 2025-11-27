/**
 * Artifact types - schemas, APIs, and UI components
 */

/**
 * Database entity in DBML schema
 */
export interface Entity {
  name: string;
  fields: Field[];
  indexes: Index[];
  featureRefs: string[]; // Features that use this entity
}

/**
 * Database field definition
 */
export interface Field {
  name: string;
  type: string;
  constraints: string[];
  default?: string;
  note?: string;
}

/**
 * Database index definition
 */
export interface Index {
  fields: string[];
  unique?: boolean;
  name?: string;
}

/**
 * Database relationship
 */
export interface Relationship {
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

/**
 * Complete DBML schema artifact
 */
export interface SchemaArtifact {
  dbml: string; // Raw DBML content
  entities: Entity[];
  relationships: Relationship[];
  lastUpdated: string;
}

/**
 * API endpoint definition
 */
export interface Endpoint {
  id: string;
  type: 'rest' | 'graphql';
  method?: string; // For REST
  path?: string; // For REST
  operation?: string; // For GraphQL
  description: string;
  featureRefs: string[]; // Features that use this endpoint
}

/**
 * OpenAPI specification artifact
 */
export interface OpenAPIArtifact {
  spec: Record<string, any>; // Full OpenAPI 3.0 spec
  endpoints: Endpoint[];
  lastUpdated: string;
}

/**
 * GraphQL type definition
 */
export interface GraphQLType {
  name: string;
  kind: 'object' | 'input' | 'enum' | 'scalar' | 'interface' | 'union';
  fields?: GraphQLField[];
  values?: string[]; // For enums
}

/**
 * GraphQL field definition
 */
export interface GraphQLField {
  name: string;
  type: string;
  args?: GraphQLArgument[];
  description?: string;
}

/**
 * GraphQL argument definition
 */
export interface GraphQLArgument {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * GraphQL operation (query/mutation)
 */
export interface GraphQLOperation {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  description?: string;
  featureRef?: string;
}

/**
 * GraphQL schema artifact
 */
export interface GraphQLArtifact {
  schema: string; // SDL schema
  types: GraphQLType[];
  operations: GraphQLOperation[];
  lastUpdated: string;
}

/**
 * UI component definition
 */
export interface UIComponent {
  id: string;
  name: string;
  type: 'page' | 'component';
  html: string; // Tailwind-styled HTML
  description: string;
  featureRefs: string[]; // Features that use this component
  createdAt: string;
  updatedAt: string;
}
