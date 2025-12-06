---
layout: default
title: React Flow Deep Dive
nav_order: 22
parent: Specification
---

# React Flow Deep Dive for Foundry Implementation

**Status:** Complete
**Last Updated:** 2025-11-26

This document synthesizes deep technical research on React Flow APIs, patterns, and gotchas specifically needed for implementing Foundry's visualization requirements: DBML schema diagrams, GraphQL type graphs, data flow diagrams, and cross-reference visualizations.

---

## Executive Summary: Critical Knowledge Areas

For Foundry's implementation, these React Flow areas require deep understanding:

1. **Complex Node Architecture** - Building table nodes with 20+ fields, collapsible sections, and multiple connection handles
2. **Layout Integration** - dagre integration with animated transitions and performance optimization
3. **State Management** - Zustand integration patterns for 100+ node diagrams
4. **Performance Optimization** - Preventing re-render cascades, virtualization gotchas
5. **TypeScript Integration** - Type-safe custom nodes with union types
6. **Edge Rendering** - Relationship cardinality, animated flows, visual clutter management

---

## 1. Complex Node Architecture

### 1.1 Collapsible Nodes - The Timing Gotcha

**Critical Issue:** When expanding/collapsing node content, React Flow must remeasure handle positions AFTER the DOM has settled with the new layout.

**The Problem:**

```jsx
// WRONG - Causes edge misalignment
const [expanded, setExpanded] = useState(false);

useEffect(() => {
  updateNodeInternals(id); // Called too early!
}, [expanded]);
```

React Flow measures handle positions before the browser has actually hidden/shown children, causing edges to connect to stale coordinates.

**The Solution:**

```jsx
import { useLayoutEffect } from 'react';

const [expanded, setExpanded] = useState(false);
const updateNodeInternals = useUpdateNodeInternals();

// CRITICAL: Use useLayoutEffect, NOT useEffect
useLayoutEffect(() => {
  updateNodeInternals(id);
}, [expanded, id, updateNodeInternals]);
```

**Why This Works:**

- `useLayoutEffect` runs synchronously after DOM mutations but before paint
- React Flow's handle measurement system gets accurate dimensions
- Edges automatically reposition

**For Async Operations:**

```jsx
const loadTableSchema = async (tableId) => {
  const fields = await fetchSchema(tableId);
  updateNodeData(nodeId, { fields });

  // Use requestAnimationFrame for async operations
  requestAnimationFrame(() => {
    updateNodeInternals(nodeId);
  });
};
```

### 1.2 Multiple Connection Handles

**Architecture:** Each handle needs a unique `id` prop. Position them dynamically using inline styles.

**Pattern for ERD Tables:**
{% raw %}

```jsx
export const DatabaseTableNode = ({ id, data }) => {
  const foreignKeyFields = data.fields.filter((f) => f.isForeignKey);

  return (
    <div className="table-node">
      <div className="table-header">{data.tableName}</div>

      {/* Primary key handle - top right */}
      <Handle type="source" position={Position.Right} id="pk" style={{ top: '25px' }} />

      {/* Foreign key handles - distributed on left side */}
      {foreignKeyFields.map((field, index) => {
        const offsetPercent = ((index + 1) / (foreignKeyFields.length + 1)) * 100;

        return (
          <Handle
            key={field.id}
            type="target"
            position={Position.Left}
            id={field.id} // CRITICAL: Unique ID
            style={{
              top: `${offsetPercent}%`,
              transform: 'translateY(-50%)',
            }}
          />
        );
      })}

      <div className="fields-container">{/* Render fields */}</div>
    </div>
  );
};
```

{% endraw %}

**Dynamic Positioning Gotcha:**

- If handle positions change (e.g., window resize, field reordering), call `updateNodeInternals(nodeId)`
- Without this, edges stay at old coordinates even though handles moved visually

### 1.3 Performance Patterns for Rich Nodes (20+ Fields)

**Problem:** Nodes with many child elements cause re-render cascades.

**Solution Pattern:**

```jsx
import { memo, useCallback } from 'react';

// CRITICAL: Memoize individual field rows
const FieldRow = memo(
  ({ field, onSelect }) => (
    <div className="field-row" onClick={() => onSelect(field.id)}>
      <span className="field-name">{field.name}</span>
      <span className="field-type">{field.type}</span>
      {field.isForeignKey && <span className="fk-badge">FK</span>}
    </div>
  ),
  (prevProps, nextProps) => {
    // Only re-render if field reference changed
    return prevProps.field === nextProps.field;
  }
);

// CRITICAL: Memoize entire node with custom comparison
export const DatabaseTableNode = memo(
  ({ id, data, isSelected }) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const [expandedFields, setExpandedFields] = useState(new Set());

    // CRITICAL: Memoize callbacks
    const handleFieldSelect = useCallback((fieldId) => {
      setExpandedFields((prev) => {
        const next = new Set(prev);
        next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId);
        return next;
      });
    }, []);

    return (
      <div className={`table-node ${isSelected ? 'selected' : ''}`}>
        <div className="table-header">{data.tableName}</div>
        {data.fields.map((field) => (
          <FieldRow key={field.id} field={field} onSelect={handleFieldSelect} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // CRITICAL: Shallow comparison only
    // Don't compare data deeply - causes constant re-renders
    return prevProps.id === nextProps.id && prevProps.isSelected === nextProps.isSelected;
  }
);
```

**Why This Matters:**

- Without memoization: every node re-renders during pan/zoom (60+ times/second)
- With 20 nodes × 20 fields = 400+ DOM elements being re-evaluated
- Memoization cuts this to only affected nodes

[... content continues with sections 1.4 through 10.4 ...]

## Sources

- [React Flow Documentation](https://reactflow.dev)
- [React Flow Layouting Guide](https://reactflow.dev/learn/layouting/layouting)
- [Custom Edges Documentation](https://reactflow.dev/learn/customization/custom-edges)
- [State Management Guide](https://reactflow.dev/learn/advanced-use/state-management)
- [TypeScript Integration](https://reactflow.dev/learn/advanced-use/typescript)
- [Edge Type Reference](https://reactflow.dev/api-reference/types/edge)
- [MiniMap Component](https://reactflow.dev/api-reference/components/minimap)
- [useReactFlow Hook](https://reactflow.dev/api-reference/hooks/use-react-flow)
- [Performance Guide](https://reactflow.dev/learn/advanced-use/performance)
- [Stack Overflow: React Flow edge not updating](https://stackoverflow.com/questions/79605662/react-flow-edge-not-updating-position-after-collapsing-node-section-with-nested)
- [Ultimate Guide to React Flow Performance - Medium](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b)

---

## Conclusion

This deep dive focuses on the hard, non-obvious aspects of React Flow that Foundry will encounter:

**Hardest Challenges:**

1. Collapsible nodes with dynamic handles (useLayoutEffect timing)
2. Performance with 100+ complex nodes (memoization patterns, store optimization)
3. Dagre integration with parent-child nodes (workaround required)
4. Multiple edges between same nodes (custom offset calculation)
5. TypeScript union types with deep generics (type guards essential)

**Key Takeaways:**

- Always use `useLayoutEffect` for handle position updates
- Memoization is non-negotiable for complex nodes
- Separate selection state from node array
- Use specific Zustand selectors, never access entire store
- Batch updates before calling `updateNodeInternals()`
- Enable virtualization from day one
- Test performance continuously with realistic data sizes
