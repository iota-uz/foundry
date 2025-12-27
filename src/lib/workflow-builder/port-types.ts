/**
 * Port Type System
 *
 * Defines data types for workflow ports, compatibility rules,
 * and visual styling for the workflow builder.
 */

/**
 * Data types supported by ports.
 * Each port has a specific type that determines compatible connections.
 */
export enum PortDataType {
  /** Text data */
  String = 'string',
  /** Numeric data */
  Number = 'number',
  /** True/false values */
  Boolean = 'boolean',
  /** Structured data (JSON objects) */
  Object = 'object',
  /** List of items */
  Array = 'array',
  /** Wildcard - compatible with any type */
  Any = 'any',
}

/**
 * Port definition for a node.
 * Describes a single input or output port.
 */
export interface PortDefinition {
  /** Unique identifier within the node (e.g., 'prompt', 'response') */
  id: string;
  /** Human-readable display label */
  label: string;
  /** Data type for type checking */
  type: PortDataType;
  /** Whether a connection to this port is required */
  required: boolean;
  /** Optional description for tooltips */
  description?: string;
}

/**
 * Schema defining all ports for a node type.
 */
export interface NodePortSchema {
  /** Input ports (receive data from other nodes) */
  inputs: PortDefinition[];
  /** Output ports (send data to other nodes) */
  outputs: PortDefinition[];
}

/**
 * Type compatibility matrix.
 * Defines which types can connect to which other types.
 *
 * Rule: Source type can connect to any of its compatible target types.
 * The 'Any' type is compatible with everything.
 */
export const PORT_COMPATIBILITY: Record<PortDataType, PortDataType[]> = {
  [PortDataType.String]: [PortDataType.String, PortDataType.Any],
  [PortDataType.Number]: [PortDataType.Number, PortDataType.Any],
  [PortDataType.Boolean]: [PortDataType.Boolean, PortDataType.Any],
  [PortDataType.Object]: [PortDataType.Object, PortDataType.Any],
  [PortDataType.Array]: [PortDataType.Array, PortDataType.Any],
  [PortDataType.Any]: [
    PortDataType.String,
    PortDataType.Number,
    PortDataType.Boolean,
    PortDataType.Object,
    PortDataType.Array,
    PortDataType.Any,
  ],
};

/**
 * Check if two port types are compatible for connection.
 *
 * @param sourceType - The output port's data type
 * @param targetType - The input port's data type
 * @returns true if a connection is allowed
 */
export function arePortsCompatible(
  sourceType: PortDataType,
  targetType: PortDataType
): boolean {
  return PORT_COMPATIBILITY[sourceType]?.includes(targetType) ?? false;
}

/**
 * CSS color variables for port types.
 * These map to Tailwind CSS custom properties.
 */
export const PORT_COLORS: Record<PortDataType, string> = {
  [PortDataType.String]: 'var(--color-port-string)',
  [PortDataType.Number]: 'var(--color-port-number)',
  [PortDataType.Boolean]: 'var(--color-port-boolean)',
  [PortDataType.Object]: 'var(--color-port-object)',
  [PortDataType.Array]: 'var(--color-port-array)',
  [PortDataType.Any]: 'var(--color-port-any)',
};

/**
 * Tailwind color classes for port types.
 * Used for background, border, and text colors.
 */
export const PORT_COLOR_CLASSES: Record<
  PortDataType,
  { bg: string; border: string; text: string }
> = {
  [PortDataType.String]: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-500',
  },
  [PortDataType.Number]: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-500',
    text: 'text-emerald-500',
  },
  [PortDataType.Boolean]: {
    bg: 'bg-amber-500',
    border: 'border-amber-500',
    text: 'text-amber-500',
  },
  [PortDataType.Object]: {
    bg: 'bg-violet-500',
    border: 'border-violet-500',
    text: 'text-violet-500',
  },
  [PortDataType.Array]: {
    bg: 'bg-teal-500',
    border: 'border-teal-500',
    text: 'text-teal-500',
  },
  [PortDataType.Any]: {
    bg: 'bg-gray-500',
    border: 'border-gray-500',
    text: 'text-gray-500',
  },
};

/**
 * Get the color for a port type.
 *
 * @param type - The port data type
 * @returns CSS color value
 */
export function getPortColor(type: PortDataType): string {
  return PORT_COLORS[type] ?? PORT_COLORS[PortDataType.Any];
}

/**
 * Get Tailwind color classes for a port type.
 *
 * @param type - The port data type
 * @returns Object with bg, border, and text class names
 */
export function getPortColorClasses(type: PortDataType): {
  bg: string;
  border: string;
  text: string;
} {
  return PORT_COLOR_CLASSES[type] ?? PORT_COLOR_CLASSES[PortDataType.Any];
}

/**
 * Get a human-readable label for a port data type.
 *
 * @param type - The port data type
 * @returns Display label
 */
export function getPortTypeLabel(type: PortDataType): string {
  switch (type) {
    case PortDataType.String:
      return 'Text';
    case PortDataType.Number:
      return 'Number';
    case PortDataType.Boolean:
      return 'Boolean';
    case PortDataType.Object:
      return 'Object';
    case PortDataType.Array:
      return 'Array';
    case PortDataType.Any:
      return 'Any';
    default:
      return 'Unknown';
  }
}
