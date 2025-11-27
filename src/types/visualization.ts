/**
 * Visualization types for React Flow diagrams
 */

import { Node, Edge } from '@xyflow/react';

/**
 * Database table field
 */
export interface DatabaseField {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isRequired: boolean;
  default?: string;
  referencedTable?: string;
  referencedField?: string;
}

/**
 * Custom node types
 */

/**
 * Database table node
 */
export interface TableNodeData {
  tableName: string;
  fields: DatabaseField[];
  module?: string;
  description?: string;
  expanded?: boolean;
  [key: string]: unknown;
}

export type TableNode = Node<TableNodeData, 'table'>;

/**
 * API endpoint node
 */
export interface EndpointNodeData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  operationId?: string;
  summary?: string;
  module?: string;
  [key: string]: unknown;
}

export type EndpointNode = Node<EndpointNodeData, 'endpoint'>;

/**
 * GraphQL type node
 */
export interface GraphQLTypeNodeData {
  typeName: string;
  kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INTERFACE' | 'UNION' | 'INPUT_OBJECT';
  fields?: Array<{
    name: string;
    type: string;
  }>;
  description?: string;
  [key: string]: unknown;
}

export type GraphQLTypeNode = Node<GraphQLTypeNodeData, 'graphqlType'>;

/**
 * Feature dependency node
 */
export interface FeatureNodeData {
  featureName: string;
  featureId: string;
  module?: string;
  status?: 'draft' | 'in_progress' | 'completed';
  description?: string;
  [key: string]: unknown;
}

export type FeatureNode = Node<FeatureNodeData, 'feature'>;

/**
 * Group/container node for module grouping
 */
export interface GroupNodeData {
  label: string;
  module?: string | undefined;
  color?: string | undefined;
  [key: string]: unknown;
}

export type GroupNode = Node<GroupNodeData, 'group'>;

/**
 * Union of all custom node types
 */
export type CustomNode =
  | TableNode
  | EndpointNode
  | GraphQLTypeNode
  | FeatureNode
  | GroupNode;

/**
 * Custom edge types
 */

/**
 * Database relationship edge
 */
export interface RelationshipEdgeData {
  cardinality?: '1:1' | '1:N' | 'N:M' | undefined;
  relationshipType?: 'FK' | 'REFERENCE' | undefined;
  label?: string | undefined;
  [key: string]: unknown;
}

export type RelationshipEdge = Edge<RelationshipEdgeData, 'relationship'>;

/**
 * Union of all custom edge types
 */
export type CustomEdge = RelationshipEdge | Edge;

/**
 * Visualization state
 */
export interface VisualizationState {
  activeTab: 'dbml' | 'openapi' | 'graphql' | 'dependencies';
  loading: boolean;
  error?: string;
  selectedNodeId?: string;
  nodes: CustomNode[];
  edges: CustomEdge[];
  setActiveTab: (tab: 'dbml' | 'openapi' | 'graphql' | 'dependencies') => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setSelectedNodeId: (id?: string) => void;
  setNodes: (nodes: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[])) => void;
  setEdges: (edges: CustomEdge[] | ((edges: CustomEdge[]) => CustomEdge[])) => void;
}

/**
 * DBML schema for visualization
 */
export interface DBMLSchema {
  tables: Array<{
    name: string;
    fields: DatabaseField[];
    note?: string;
  }>;
  relationships: Array<{
    id: string;
    source: string;
    target: string;
    sourceField: string;
    targetField: string;
    cardinality: '1:1' | '1:N' | 'N:M';
  }>;
}

/**
 * OpenAPI specification for visualization
 */
export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  servers?: Array<{
    url: string;
  }>;
  paths?: Record<string, any>;
}

/**
 * GraphQL schema for visualization
 */
export interface GraphQLSchema {
  types: Array<{
    name: string;
    kind: string;
    fields?: Array<{
      name: string;
      type: string;
    }>;
    description?: string;
  }>;
}
