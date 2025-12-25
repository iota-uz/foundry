/**
 * GraphQL schema parser utilities
 * Extracts types and operations from GraphQL SDL
 */

import type { GraphQLType, GraphQLOperation, GraphQLField } from '@/types/domain/artifact';

/**
 * Parse GraphQL schema to extract types
 */
export function parseGraphQLTypes(schema: string): GraphQLType[] {
  const types: GraphQLType[] = [];

  // Match type definitions
  const typeRegex = /type\s+(\w+)\s*(?:implements\s+[\w\s&]+)?\s*\{([^}]+)\}/g;
  let match;

  while ((match = typeRegex.exec(schema)) !== null) {
    const [, name, fieldsBlock] = match;
    const fields = parseFields(fieldsBlock || '');

    types.push({
      name: name || '',
      kind: 'object',
      fields,
    });
  }

  // Match input types
  const inputRegex = /input\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = inputRegex.exec(schema)) !== null) {
    const [, name, fieldsBlock] = match;
    const fields = parseFields(fieldsBlock || '');

    types.push({
      name: name || '',
      kind: 'input',
      fields,
    });
  }

  // Match enum types
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = enumRegex.exec(schema)) !== null) {
    const [, name, valuesBlock] = match;
    const values = (valuesBlock || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    types.push({
      name: name || '',
      kind: 'enum',
      values,
    });
  }

  // Match scalar types
  const scalarRegex = /scalar\s+(\w+)/g;
  while ((match = scalarRegex.exec(schema)) !== null) {
    const [, name] = match;
    types.push({
      name: name || '',
      kind: 'scalar',
    });
  }

  // Match interface types
  const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
  while ((match = interfaceRegex.exec(schema)) !== null) {
    const [, name, fieldsBlock] = match;
    const fields = parseFields(fieldsBlock || '');

    types.push({
      name: name || '',
      kind: 'interface',
      fields,
    });
  }

  return types;
}

/**
 * Parse GraphQL schema to extract operations
 */
export function parseGraphQLOperations(schema: string): GraphQLOperation[] {
  const operations: GraphQLOperation[] = [];

  // Extract Query type operations
  const queryMatch = /type\s+Query\s*\{([^}]+)\}/g.exec(schema);
  if (queryMatch) {
    const fields = parseFields(queryMatch[1] || '');
    for (const field of fields) {
      operations.push({
        name: field.name,
        type: 'query',
        ...(field.description && { description: field.description }),
      });
    }
  }

  // Extract Mutation type operations
  const mutationMatch = /type\s+Mutation\s*\{([^}]+)\}/g.exec(schema);
  if (mutationMatch) {
    const fields = parseFields(mutationMatch[1] || '');
    for (const field of fields) {
      operations.push({
        name: field.name,
        type: 'mutation',
        ...(field.description && { description: field.description }),
      });
    }
  }

  // Extract Subscription type operations
  const subscriptionMatch = /type\s+Subscription\s*\{([^}]+)\}/g.exec(schema);
  if (subscriptionMatch) {
    const fields = parseFields(subscriptionMatch[1] || '');
    for (const field of fields) {
      operations.push({
        name: field.name,
        type: 'subscription',
        ...(field.description && { description: field.description }),
      });
    }
  }

  return operations;
}

/**
 * Parse field definitions from a type block
 */
function parseFields(fieldsBlock: string): GraphQLField[] {
  const fields: GraphQLField[] = [];
  const lines = fieldsBlock.split('\n');

  let currentDescription: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Capture description comments
    if (trimmed.startsWith('#') || trimmed.startsWith('"""')) {
      currentDescription = trimmed.replace(/^#\s*/, '').replace(/"""/g, '').trim();
      continue;
    }

    // Parse field definition
    const fieldMatch = /^(\w+)\s*(\([^)]*\))?\s*:\s*(.+)$/.exec(trimmed);
    if (fieldMatch) {
      const [, name, , type] = fieldMatch;

      fields.push({
        name: name || '',
        type: type?.trim() || '',
        ...(currentDescription && { description: currentDescription }),
      });

      currentDescription = undefined;
    }
  }

  return fields;
}
