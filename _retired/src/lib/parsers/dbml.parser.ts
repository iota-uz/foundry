/**
 * DBML parser utilities
 * Extracts entities and relationships from DBML schema
 */

import type { Entity, Relationship, Field, Index } from '@/types/domain/artifact';

/**
 * Parse DBML to extract entities
 */
export function parseDBMLEntities(dbml: string): Entity[] {
  const entities: Entity[] = [];

  // Match table definitions
  const tableRegex = /Table\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = tableRegex.exec(dbml)) !== null) {
    const [, tableName, tableBody] = match;

    const fields = parseTableFields(tableBody || '');
    const indexes = parseTableIndexes(tableBody || '');

    entities.push({
      name: tableName || '',
      fields,
      indexes,
      featureRefs: [],
    });
  }

  return entities;
}

/**
 * Parse DBML to extract relationships
 */
export function parseDBMLRelationships(dbml: string): Relationship[] {
  const relationships: Relationship[] = [];

  // Match Ref definitions (both inline and standalone)
  // Standalone: Ref: table1.field1 > table2.field2
  const standaloneRefRegex = /Ref:\s*(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)/g;
  let match;

  while ((match = standaloneRefRegex.exec(dbml)) !== null) {
    const [, fromTable, fromField, operator, toTable, toField] = match;

    let type: 'one_to_one' | 'one_to_many' | 'many_to_many' = 'one_to_many';

    if (operator === '-' || operator === '--') {
      type = 'one_to_one';
    } else if (operator === '>' || operator === '<') {
      type = 'one_to_many';
    } else if (operator === '<>') {
      type = 'many_to_many';
    }

    relationships.push({
      fromTable: fromTable || '',
      fromField: fromField || '',
      toTable: toTable || '',
      toField: toField || '',
      type,
    });
  }

  // Match inline ref definitions in fields
  const inlineRefRegex = /(\w+)\s+\w+\s+\[ref:\s*([<>-])\s*(\w+)\.(\w+)\]/g;
  while ((match = inlineRefRegex.exec(dbml)) !== null) {
    const [, fieldName, operator, toTable, toField] = match;

    // Extract table name from context (this is simplified)
    const tableMatch = dbml.substring(0, match.index).match(/Table\s+(\w+)\s*\{[^}]*$/);
    const fromTable = tableMatch ? tableMatch[1] : '';

    if (!fromTable) continue;

    let type: 'one_to_one' | 'one_to_many' | 'many_to_many' = 'one_to_many';

    if (operator === '-') {
      type = 'one_to_one';
    } else if (operator === '>') {
      type = 'one_to_many';
    } else if (operator === '<') {
      type = 'one_to_many';
    }

    relationships.push({
      fromTable: fromTable || '',
      fromField: fieldName || '',
      toTable: toTable || '',
      toField: toField || '',
      type,
    });
  }

  return relationships;
}

/**
 * Parse table fields from table body
 */
function parseTableFields(tableBody: string): Field[] {
  const fields: Field[] = [];
  const lines = tableBody.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and indexes
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('indexes') || trimmed.startsWith('Indexes')) {
      continue;
    }

    // Parse field definition: name type [constraints]
    const fieldMatch = /^(\w+)\s+(\w+(?:\([^)]*\))?)\s*(\[.*\])?/.exec(trimmed);
    if (fieldMatch) {
      const [, name, type, constraintsBlock] = fieldMatch;

      const constraints: string[] = [];
      let note: string | undefined;

      if (constraintsBlock) {
        // Extract constraints
        if (constraintsBlock.includes('pk')) constraints.push('PRIMARY KEY');
        if (constraintsBlock.includes('not null')) constraints.push('NOT NULL');
        if (constraintsBlock.includes('unique')) constraints.push('UNIQUE');
        if (constraintsBlock.includes('increment')) constraints.push('AUTO_INCREMENT');

        // Extract default value
        const defaultMatch = /default:\s*['"]?([^'",\]]+)['"]?/.exec(constraintsBlock);
        if (defaultMatch) {
          constraints.push(`DEFAULT ${defaultMatch[1]}`);
        }

        // Extract note
        const noteMatch = /note:\s*['"]([^'"]+)['"]/.exec(constraintsBlock);
        if (noteMatch) {
          note = noteMatch[1];
        }
      }

      fields.push({
        name: name || '',
        type: type || '',
        constraints,
        ...(note && { note }),
      });
    }
  }

  return fields;
}

/**
 * Parse table indexes from table body
 */
function parseTableIndexes(tableBody: string): Index[] {
  const indexes: Index[] = [];

  // Match indexes block
  const indexesMatch = /(?:indexes|Indexes)\s*\{([^}]+)\}/.exec(tableBody);
  if (!indexesMatch) {
    return indexes;
  }

  const indexesBlock = indexesMatch[1] || '';
  const lines = indexesBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse index definition: (field1, field2) [unique] or field [unique]
    const indexMatch = /\(?([^)]+)\)?\s*(\[.*\])?/.exec(trimmed);
    if (indexMatch) {
      const [, fieldsStr, constraintsBlock] = indexMatch;

      const fields = (fieldsStr || '')
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      const unique = constraintsBlock?.includes('unique') || constraintsBlock?.includes('pk');
      const nameMatch = constraintsBlock?.match(/name:\s*['"]([^'"]+)['"]/);

      indexes.push({
        fields,
        ...(unique !== undefined && { unique }),
        ...(nameMatch?.[1] && { name: nameMatch[1] }),
      });
    }
  }

  return indexes;
}
