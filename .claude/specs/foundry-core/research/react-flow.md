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
```jsx
export const DatabaseTableNode = ({ id, data }) => {
  const foreignKeyFields = data.fields.filter(f => f.isForeignKey);

  return (
    <div className="table-node">
      <div className="table-header">{data.tableName}</div>

      {/* Primary key handle - top right */}
      <Handle
        type="source"
        position={Position.Right}
        id="pk"
        style={{ top: '25px' }}
      />

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
              transform: 'translateY(-50%)'
            }}
          />
        );
      })}

      <div className="fields-container">
        {/* Render fields */}
      </div>
    </div>
  );
};
```

**Dynamic Positioning Gotcha:**
- If handle positions change (e.g., window resize, field reordering), call `updateNodeInternals(nodeId)`
- Without this, edges stay at old coordinates even though handles moved visually

### 1.3 Performance Patterns for Rich Nodes (20+ Fields)

**Problem:** Nodes with many child elements cause re-render cascades.

**Solution Pattern:**
```jsx
import { memo, useCallback } from 'react';

// CRITICAL: Memoize individual field rows
const FieldRow = memo(({ field, onSelect }) => (
  <div className="field-row" onClick={() => onSelect(field.id)}>
    <span className="field-name">{field.name}</span>
    <span className="field-type">{field.type}</span>
    {field.isForeignKey && <span className="fk-badge">FK</span>}
  </div>
), (prevProps, nextProps) => {
  // Only re-render if field reference changed
  return prevProps.field === nextProps.field;
});

// CRITICAL: Memoize entire node with custom comparison
export const DatabaseTableNode = memo(({ id, data, isSelected }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const [expandedFields, setExpandedFields] = useState(new Set());

  // CRITICAL: Memoize callbacks
  const handleFieldSelect = useCallback((fieldId) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId);
      return next;
    });
  }, []);

  return (
    <div className={`table-node ${isSelected ? 'selected' : ''}`}>
      <div className="table-header">{data.tableName}</div>
      {data.fields.map(field => (
        <FieldRow
          key={field.id}
          field={field}
          onSelect={handleFieldSelect}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // CRITICAL: Shallow comparison only
  // Don't compare data deeply - causes constant re-renders
  return prevProps.id === nextProps.id &&
         prevProps.isSelected === nextProps.isSelected;
});
```

**Why This Matters:**
- Without memoization: every node re-renders during pan/zoom (60+ times/second)
- With 20 nodes × 20 fields = 400+ DOM elements being re-evaluated
- Memoization cuts this to only affected nodes

### 1.4 Parent-Child Nodes & Grouping

**Core Concept:** Set `parentId` property on child nodes for relative positioning.

**CRITICAL - Array Ordering:**
```javascript
// WRONG - Children before parent
const nodes = [
  { id: 'child1', parentId: 'parent1', ... }, // Broken!
  { id: 'parent1', type: 'group', ... }
];

// CORRECT - Parent must appear first
const nodes = [
  { id: 'parent1', type: 'group', ... },
  { id: 'child1', parentId: 'parent1', ... }
];
```

React Flow processes nodes sequentially. If a child appears before its parent, the relationship breaks.

**Extent Property - Boundary Constraints:**
```javascript
// Option 1: No constraint (default)
{ id: 'child1', parentId: 'parent1' }

// Option 2: Confine to parent bounds
{ id: 'child1', parentId: 'parent1', extent: 'parent' }

// Option 3: Custom boundaries
{ id: 'child1', parentId: 'parent1', extent: [[0, 0], [width, height]] }
```

**Collapsible Groups Pattern:**
```jsx
const CollapsibleGroupNode = ({ id, data }) => {
  const [expanded, setExpanded] = useState(true);
  const { setNodes } = useReactFlow();

  const toggleCollapse = useCallback(() => {
    setExpanded(prev => {
      const newState = !prev;

      // Update all child nodes' hidden property
      setNodes(nodes =>
        nodes.map(node =>
          node.parentId === id
            ? { ...node, hidden: !newState }
            : node
        )
      );

      return newState;
    });
  }, [id, setNodes]);

  return (
    <div className="group-node">
      <button onClick={toggleCollapse}>
        {expanded ? '▼ Collapse' : '▶ Expand'}
      </button>
      <h3>{data.label}</h3>
    </div>
  );
};
```

**Performance Consideration:**
- `hidden: true` keeps nodes in memory but doesn't render them
- Removing nodes is more memory-efficient but requires finding them again
- For 10-20 child nodes, `hidden: true` is preferred for smooth expand/collapse

---

## 2. Layout Integration with Dagre

### 2.1 Basic Integration Pattern

```jsx
import dagre from 'dagre';
import { Position } from '@xyflow/react';

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure layout
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 75,  // Vertical spacing
    nodesep: 50,  // Horizontal spacing
    edgesep: 10   // Edge spacing
  });

  // Add nodes with dimensions
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {
      width: node.width || 150,
      height: node.height || 50
    });
  });

  // Add edges
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Map positions back to React Flow nodes
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      position: {
        x: nodeWithPosition.x - (node.width || 150) / 2,
        y: nodeWithPosition.y - (node.height || 50) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
```

### 2.2 Recalculation Strategies

**Trigger Layout on Specific Events:**
```jsx
const FlowContainer = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const onLayout = useCallback((direction) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      getLayoutedElements(nodes, edges, direction);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges]);

  // Trigger layout on:
  // 1. Node expansion/collapse
  // 2. Node addition/removal
  // 3. Manual user action

  return (
    <ReactFlow nodes={nodes} edges={edges}>
      <Controls>
        <button onClick={() => onLayout('TB')}>Vertical Layout</button>
        <button onClick={() => onLayout('LR')}>Horizontal Layout</button>
      </Controls>
    </ReactFlow>
  );
};
```

**Performance Gotcha:**
- dagre layout is synchronous and blocks the main thread
- For large graphs (100+ nodes), show loading indicator:

```jsx
const onLayoutWithLoading = useCallback(async (direction) => {
  setLayouting(true);

  // Use setTimeout to defer layout to next tick
  setTimeout(() => {
    const layouted = getLayoutedElements(nodes, edges, direction);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setLayouting(false);
  }, 0);
}, [nodes, edges]);
```

### 2.3 Animated Layout Transitions

```jsx
const onLayoutAnimated = useCallback((direction) => {
  const layouted = getLayoutedElements(nodes, edges, direction);

  // Map nodes with CSS transitions
  const animatedNodes = layouted.nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      transition: 'all 0.3s ease-in-out'
    }
  }));

  setNodes(animatedNodes);
}, [nodes, edges]);
```

**CSS Support:**
```css
.react-flow__node {
  transition: transform 0.3s ease-in-out;
}
```

### 2.4 Dagre Limitations & Workarounds

**Known Issue:** Dagre has an open bug with sub-flows (parent-child nodes).

**Workaround for Hierarchical Modules:**
1. Layout each module independently
2. Calculate module bounding boxes
3. Layout module containers with dagre
4. Position children relative to parent

```jsx
const layoutHierarchical = (modules, nodes, edges) => {
  // Step 1: Layout each module's nodes
  const modulesWithLayout = modules.map(module => {
    const moduleNodes = nodes.filter(n => n.data.module === module.id);
    const moduleEdges = edges.filter(e =>
      moduleNodes.some(n => n.id === e.source || n.id === e.target)
    );

    return getLayoutedElements(moduleNodes, moduleEdges, 'TB');
  });

  // Step 2: Create module container nodes
  const moduleContainers = modules.map((module, index) => ({
    id: module.id,
    type: 'group',
    position: { x: index * 400, y: 0 },
    data: { label: module.name }
  }));

  // Step 3: Position children relative to containers
  const finalNodes = modulesWithLayout.flatMap((layout, index) => {
    const container = moduleContainers[index];
    return layout.nodes.map(node => ({
      ...node,
      parentId: container.id,
      position: {
        x: node.position.x - container.position.x,
        y: node.position.y - container.position.y
      }
    }));
  });

  return [...moduleContainers, ...finalNodes];
};
```

### 2.5 Dynamic Node Dimensions

**Critical Gotcha:** Dagre needs actual node dimensions, but React Flow only knows dimensions after render.

**Solution - Two-Pass Approach:**
```jsx
const [needsLayout, setNeedsLayout] = useState(true);

useEffect(() => {
  if (needsLayout && nodes.every(n => n.width && n.height)) {
    const layouted = getLayoutedElements(nodes, edges);
    setNodes(layouted.nodes);
    setNeedsLayout(false);
  }
}, [needsLayout, nodes, edges]);

// In node component, update dimensions:
const nodeRef = useRef(null);

useLayoutEffect(() => {
  if (nodeRef.current) {
    const { offsetWidth, offsetHeight } = nodeRef.current;
    if (data.width !== offsetWidth || data.height !== offsetHeight) {
      updateNodeData(id, {
        width: offsetWidth,
        height: offsetHeight
      });
    }
  }
}, [id, data.width, data.height]);
```

---

## 3. Advanced Edge Patterns

### 3.1 Edge Path Types

React Flow provides four utility functions:

- **`getStraightPath`**: Direct linear connection
- **`getBezierPath`**: Smooth curved paths (default)
- **`getSimpleBezierPath`**: Simplified bezier
- **`getSmoothStepPath`**: Step-based smooth transitions

**Selection Criteria for ERD:**
- Use `getSmoothStepPath` for orthogonal database diagrams (cleaner at intersections)
- Use `getBezierPath` for organic relationship flows

**SmoothStepPath Configuration:**
```jsx
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY }) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 8,    // Corner rounding
    offset: 20          // Offset from nodes
  });

  return <BaseEdge id={id} path={edgePath} />;
};
```

### 3.2 Edge Labels with Relationship Cardinality

**Pattern for ERD Relationships:**
```jsx
const RelationshipEdge = ({
  id,
  sourceX, sourceY,
  targetX, targetY,
  data // { cardinality: '1:N' }
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            border: '1px solid #ccc',
            pointerEvents: 'all',
          }}
        >
          {data.cardinality}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
```

**Key Points:**
- `EdgeLabelRenderer` renders labels in HTML, not SVG (allows interactivity)
- Labels are positioned absolutely using transform
- `pointerEvents: 'all'` makes labels clickable

### 3.3 Animated Edges for Data Flow

**CSS Animation Approach:**
```jsx
const AnimatedDataFlowEdge = ({ id, sourceX, sourceY, targetX, targetY }) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeDasharray: '5,5',
          animation: 'dash 0.5s linear infinite'
        }}
      />
    </>
  );
};
```

**CSS:**
```css
@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}
```

**SVG Animation Approach (smoother):**
```jsx
const AnimatedEdge = ({ id, sourceX, sourceY, targetX, targetY }) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      <circle r="4" fill="#3b82f6">
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
    </g>
  );
};
```

### 3.4 Multiple Edges Between Same Nodes

**Problem:** Overlapping edges are visually confusing.

**Solution - Offset Edges:**
```jsx
const getOffsetEdgePath = (sourceX, sourceY, targetX, targetY, offset) => {
  // Calculate perpendicular offset
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);

  const offsetX = (-dy / length) * offset;
  const offsetY = (dx / length) * offset;

  return getBezierPath({
    sourceX: sourceX + offsetX,
    sourceY: sourceY + offsetY,
    targetX: targetX + offsetX,
    targetY: targetY + offsetY,
  });
};

// In edge component:
const edgeIndex = edges.filter(e =>
  (e.source === source && e.target === target) ||
  (e.source === target && e.target === source)
).indexOf(currentEdge);

const offset = edgeIndex * 20; // 20px offset per edge
const [edgePath] = getOffsetEdgePath(sourceX, sourceY, targetX, targetY, offset);
```

### 3.5 Connection Validation

**Prevent Invalid Connections:**
```jsx
const isValidConnection = useCallback((connection) => {
  // Example: Prevent self-connections
  if (connection.source === connection.target) return false;

  // Example: Only allow target handles to connect to source handles
  const sourceNode = getNode(connection.source);
  const targetNode = getNode(connection.target);

  if (!sourceNode || !targetNode) return false;

  // Custom validation logic
  const sourceType = sourceNode.data.type;
  const targetType = targetNode.data.type;

  // Example: Only allow "table" to connect to "table"
  if (sourceType !== 'table' || targetType !== 'table') return false;

  return true;
}, [getNode]);

<ReactFlow isValidConnection={isValidConnection} />
```

### 3.6 Edge Type Reference

**Key Edge Properties:**

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For multiple handles
  targetHandle?: string;

  type?: 'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier' | string;
  animated?: boolean;
  hidden?: boolean;

  // Styling
  style?: CSSProperties;
  className?: string;

  // Labels
  label?: string | React.ReactNode;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;

  // Markers (arrows)
  markerStart?: string | EdgeMarker;
  markerEnd?: string | EdgeMarker;

  // Interaction
  interactionWidth?: number;  // Invisible clickable area around edge
  reconnectable?: boolean | 'source' | 'target';
  focusable?: boolean;
  selectable?: boolean;

  // Custom data
  data?: any;

  // State
  selected?: boolean;
  zIndex?: number;
}
```

**Lesser-Known Properties:**

- **`interactionWidth`**: React Flow renders an invisible path around edges to make them easier to click (default: 20px)
- **`reconnectable`**: Allow users to drag edge endpoints to different nodes
- **`pathOptions`**: Variant-specific options (e.g., `{ borderRadius: 10 }` for smoothstep)

---

## 4. State Management with Zustand

### 4.1 Controlled Pattern with Zustand

**Store Setup:**
```typescript
import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection
} from '@xyflow/react';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  setNodes: (nodesOrUpdater) => {
    const nodes = typeof nodesOrUpdater === 'function'
      ? nodesOrUpdater(get().nodes)
      : nodesOrUpdater;
    set({ nodes });
  },

  setEdges: (edgesOrUpdater) => {
    const edges = typeof edgesOrUpdater === 'function'
      ? edgesOrUpdater(get().edges)
      : edgesOrUpdater;
    set({ edges });
  },
}));
```

**Component Usage:**
```jsx
const FlowContainer = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
    />
  );
};
```

### 4.2 State Synchronization Gotchas

**Critical: Always Create New Objects**

```jsx
// WRONG - Mutates existing object
const updateNodeDataWrong = (nodeId, newData) => {
  const node = nodes.find(n => n.id === nodeId);
  node.data = { ...node.data, ...newData }; // Mutation!
  setNodes(nodes); // React Flow won't detect change
};

// CORRECT - Creates new object
const updateNodeDataCorrect = (nodeId, newData) => {
  setNodes(nodes => nodes.map(node =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, ...newData } }
      : node
  ));
};
```

**Why:** React Flow's change detection relies on reference equality. Mutating objects breaks change detection.

### 4.3 Viewport State Persistence

**Save Viewport:**
```jsx
import { useReactFlow } from '@xyflow/react';

const SaveButton = () => {
  const { getViewport } = useReactFlow();

  const saveFlow = () => {
    const flow = {
      nodes: useFlowStore.getState().nodes,
      edges: useFlowStore.getState().edges,
      viewport: getViewport(), // { x, y, zoom }
    };

    localStorage.setItem('flow', JSON.stringify(flow));
  };

  return <button onClick={saveFlow}>Save</button>;
};
```

**Restore Viewport:**
```jsx
const LoadButton = () => {
  const { setViewport } = useReactFlow();
  const { setNodes, setEdges } = useFlowStore();

  const loadFlow = () => {
    const flow = JSON.parse(localStorage.getItem('flow') || '{}');

    if (flow.nodes) setNodes(flow.nodes);
    if (flow.edges) setEdges(flow.edges);
    if (flow.viewport) {
      // Set viewport after nodes are rendered
      requestAnimationFrame(() => {
        setViewport(flow.viewport, { duration: 300 });
      });
    }
  };

  return <button onClick={loadFlow}>Load</button>;
};
```

### 4.4 Avoiding Store Access in Render

**Anti-Pattern - Causes Excessive Re-renders:**
```jsx
const DatabaseTableNode = ({ id, data }) => {
  // WRONG - Re-renders on ANY store change
  const allNodes = useFlowStore(state => state.nodes);

  return <div>{data.tableName}</div>;
};
```

**Correct Pattern - Specific Selectors:**
```jsx
const DatabaseTableNode = ({ id, data }) => {
  // CORRECT - Only subscribes to node count
  const nodeCount = useFlowStore(state => state.nodes.length);

  // CORRECT - Use zustand's selector with shallow equality
  const relatedNodes = useFlowStore(
    state => state.nodes.filter(n => data.relatedIds.includes(n.id)),
    (a, b) => a.length === b.length && a.every((node, i) => node.id === b[i].id)
  );

  return <div>{data.tableName}</div>;
};
```

---

## 5. Performance Optimization Deep Dive

### 5.1 The Primary Re-render Culprit

**Store Reference Changes:**
```jsx
// ANTI-PATTERN - Recreates array every store update
const selectedNodes = useStore(state =>
  state.nodes.filter(n => n.selected) // New array reference!
);
```

**Why This Is Catastrophic:**
- Every pan/zoom/drag updates `state.nodes`
- Filter creates new array (new reference)
- All components using this selector re-render
- Happens 60+ times per second during interactions

**Solution - Separate Selection State:**
```jsx
// In Zustand store:
interface FlowState {
  nodes: Node[];
  selectedNodeIds: Set<string>; // Separate state

  selectNode: (id: string) => void;
  deselectNode: (id: string) => void;
}

// In component:
const isSelected = useFlowStore(
  state => state.selectedNodeIds.has(nodeId),
  // Custom equality - only re-render if this node's selection changed
);
```

### 5.2 When React.memo Isn't Enough

**Scenario That Breaks memo:**
```jsx
const TableNode = memo(({ id, data }) => {
  // PROBLEM: Hook causes re-render on ANY change
  const { getNode } = useReactFlow();

  // PROBLEM: Accesses entire store
  const nodes = useStore(state => state.nodes);

  return <div>{data.tableName}</div>;
});
```

**Solution:**
```jsx
const TableNode = memo(({ id, data }) => {
  // CORRECT: Only access specific methods
  const { updateNodeData } = useReactFlow();

  // CORRECT: Specific selector
  const siblingCount = useStore(
    state => state.nodes.filter(n => n.data.module === data.module).length
  );

  return <div>{data.tableName}</div>;
});
```

### 5.3 Virtualization Configuration

**Enable from Day One:**
```jsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onlyRenderVisibleElements={true} // Enable virtualization
/>
```

**Performance Thresholds:**
- < 50 nodes: No optimization needed
- 50-200 nodes: Virtualization essential
- 200-500 nodes: Add hierarchical collapse
- 500+ nodes: Consider level-of-detail rendering

**Virtualization Gotcha:**
- May cause slight visual pop-in during fast panning
- Nodes outside viewport aren't in DOM
- `querySelector` won't find non-rendered nodes

### 5.4 Batch Updates for Multiple Nodes

**Anti-Pattern:**
```jsx
// Triggers 10 separate re-renders
tables.forEach(table => {
  updateNodeData(`table-${table.id}`, { expanded: true });
  updateNodeInternals(`table-${table.id}`);
});
```

**Correct Pattern:**
```jsx
// Single state update
setNodes(nodes => nodes.map(node => {
  if (tablesToExpand.has(node.id)) {
    return { ...node, data: { ...node.data, expanded: true } };
  }
  return node;
}));

// Single measurement pass
requestAnimationFrame(() => {
  tablesToExpand.forEach(id => updateNodeInternals(id));
});
```

### 5.5 Handle Positioning Recalculation Costs

**What Triggers:**
Every `updateNodeInternals()` call:
1. DOM measurement (getBoundingClientRect)
2. Handle position recalculation (all handles in node)
3. Edge endpoint recalculation (all connected edges)
4. Parent/child extent recalculation

**For ERD with 20 tables × 5 handles = 100 measurements**

**Optimization:**
- Batch handle updates
- Use `requestAnimationFrame()` to defer to next frame
- Only call when actually needed (not on every render)

---

## 6. TypeScript Integration

### 6.1 Custom Node Data Types

**Define Union Types:**
```typescript
import { Node, Edge, BuiltInNode, BuiltInEdge } from '@xyflow/react';

// Custom node types
type TableNode = Node<{
  tableName: string;
  fields: Field[];
  expanded: boolean;
}, 'table'>;

type ModuleGroupNode = Node<{
  moduleName: string;
  color: string;
}, 'moduleGroup'>;

// Union with built-in types
export type AppNode = BuiltInNode | TableNode | ModuleGroupNode;

// Custom edge types
type RelationshipEdge = Edge<{
  cardinality: '1:1' | '1:N' | 'N:M';
  relationshipType: 'FK' | 'REFERENCE';
}, 'relationship'>;

export type AppEdge = BuiltInEdge | RelationshipEdge;
```

**Why Union Types:**
- Enables discriminated unions with type guards
- TypeScript narrows types based on `type` property
- Allows mixing built-in and custom node types

### 6.2 Type-Safe Node Components

**Single Component Pattern:**
```typescript
import { NodeProps } from '@xyflow/react';

export const CustomNode = ({ id, data, type }: NodeProps<AppNode>) => {
  // Type guard pattern
  if (type === 'table') {
    // TypeScript knows data is TableNode['data']
    return <div>{data.tableName}</div>;
  }

  if (type === 'moduleGroup') {
    // TypeScript knows data is ModuleGroupNode['data']
    return <div>{data.moduleName}</div>;
  }

  return null;
};
```

**Multiple Component Pattern:**
```typescript
const TableNodeComponent = ({ data }: NodeProps<TableNode>) => {
  return <div>{data.tableName}</div>;
};

const ModuleGroupNodeComponent = ({ data }: NodeProps<ModuleGroupNode>) => {
  return <div>{data.moduleName}</div>;
};

// Register with nodeTypes
const nodeTypes = {
  table: TableNodeComponent,
  moduleGroup: ModuleGroupNodeComponent,
};
```

### 6.3 Type-Safe Hooks

**Generic Type Parameters:**
```typescript
const { getNodes, getEdges, setNodes, setEdges } =
  useReactFlow<AppNode, AppEdge>();

const nodes = useNodesState<AppNode>([]);
const edges = useEdgesState<AppEdge>([]);

// Store selector with types
const tableNodes = useStore<ReactFlowState<AppNode>, TableNode[]>(
  state => state.nodes.filter((n): n is TableNode => n.type === 'table')
);
```

### 6.4 Type-Safe Event Handlers

```typescript
import { OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';

const onNodesChange: OnNodesChange<AppNode> = useCallback(
  (changes) => {
    setNodes(nds => applyNodeChanges(changes, nds));
  },
  [setNodes]
);

const onNodeClick: NodeMouseHandler<AppNode> = useCallback(
  (event, node) => {
    if (node.type === 'table') {
      // TypeScript knows node is TableNode
      console.log(node.data.tableName);
    }
  },
  []
);
```

### 6.5 Type Guards

**Reusable Type Predicates:**
```typescript
function isTableNode(node: AppNode): node is TableNode {
  return node.type === 'table';
}

function isModuleGroupNode(node: AppNode): node is ModuleGroupNode {
  return node.type === 'moduleGroup';
}

// Usage
const tableNodes = nodes.filter(isTableNode);
// tableNodes is now TableNode[]
```

### 6.6 Common TypeScript Errors

**Error: Property does not exist on type Node**
```typescript
// Wrong - accessing custom data without type
const name = node.data.tableName; // Error!

// Correct - with type guard
if (isTableNode(node)) {
  const name = node.data.tableName; // OK
}
```

**Error: Type instantiation is excessively deep**
- Caused by deeply nested generic types
- Solution: Simplify node/edge type unions
- Use `type` instead of `interface` for node data

---

## 7. Mini-map and Controls

### 7.1 MiniMap Configuration

**Basic Setup:**
```jsx
import { MiniMap } from '@xyflow/react';

<ReactFlow>
  <MiniMap
    nodeColor={(node) => {
      switch (node.type) {
        case 'table': return '#3b82f6';
        case 'moduleGroup': return '#10b981';
        default: return '#6b7280';
      }
    }}
    nodeStrokeColor="#000"
    nodeStrokeWidth={2}
    nodeBorderRadius={4}
    position="bottom-right"
    pannable={true}
    zoomable={true}
  />
</ReactFlow>
```

**Performance Consideration:**
- MiniMap renders each node as SVG element
- Performance degrades with 100+ nodes
- Use simple node representation

**Custom Node Rendering:**
```jsx
const MiniMapNode = ({ x, y, width, height, color }) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    fill={color}
    stroke="#000"
    strokeWidth={1}
    rx={2} // rounded corners
  />
);

<MiniMap nodeComponent={MiniMapNode} />
```

**Gotchas:**
- Must use **only SVG elements** in custom node components
- No HTML allowed
- Nodes outside viewport aren't rendered in minimap

### 7.2 Controls Customization

```jsx
import { Controls, ControlButton } from '@xyflow/react';

<Controls position="top-right">
  <ControlButton onClick={() => onLayout('TB')}>
    ⬇️
  </ControlButton>
  <ControlButton onClick={() => onLayout('LR')}>
    ➡️
  </ControlButton>
</Controls>
```

### 7.3 Viewport Manipulation

**useReactFlow Methods:**
```jsx
const {
  fitView,      // Fit all nodes in viewport
  zoomIn,       // Zoom in
  zoomOut,      // Zoom out
  zoomTo,       // Zoom to specific level
  setCenter,    // Center on coordinates
  getZoom,      // Get current zoom
  getViewport,  // Get { x, y, zoom }
  setViewport   // Set viewport
} = useReactFlow();

// Fit all nodes with padding
fitView({ padding: 0.2, duration: 300 });

// Zoom to specific node
const focusNode = (nodeId: string) => {
  const node = getNode(nodeId);
  if (node) {
    setCenter(
      node.position.x + (node.width || 0) / 2,
      node.position.y + (node.height || 0) / 2,
      { zoom: 1.5, duration: 500 }
    );
  }
};

// Animated viewport changes
setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 });
```

---

## 8. Critical Gotchas Reference

| Gotcha | Symptom | Solution |
|--------|---------|----------|
| **useEffect vs useLayoutEffect** | Edges don't reposition after collapse | Use `useLayoutEffect` with `updateNodeInternals()` |
| **Handle ID Conflicts** | "Couldn't create edge" error | Ensure unique `id` prop for each handle within node |
| **Parent Array Ordering** | Child nodes don't attach to parent | Parent nodes MUST appear before children in array |
| **Store Reference Changes** | All nodes re-render during pan | Separate selection state from node array |
| **React.memo + useReactFlow** | memo not preventing re-renders | Minimize hook usage, use specific selectors |
| **Async Handle Updates** | Handles measure before DOM settles | Use `requestAnimationFrame()` after async ops |
| **Batch Measurements** | Jank with 10+ node updates | Update all data first, then call `updateNodeInternals()` |
| **display: none on Handles** | Handles measured at 0,0 | Use `opacity: 0` or `visibility: hidden` instead |
| **Shallow Merge updateNodeData** | Array changes don't trigger updates | Create new array references explicitly |
| **Dagre Sub-flow Bug** | Parent-child layouts broken | Layout modules independently, then position |
| **Node Dimensions Unknown** | Layout incorrect on first render | Two-pass: render first, measure, then layout |
| **MiniMap HTML Elements** | MiniMap broken | Only use SVG elements in `nodeComponent` |
| **Type Instantiation Deep** | TypeScript compilation error | Simplify type unions, use `type` not `interface` |

---

## 9. Foundry-Specific Implementation Patterns

### 9.1 ERD Table Node Complete Example

```typescript
import { memo, useState, useCallback, useLayoutEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, NodeProps } from '@xyflow/react';

interface Field {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
}

interface TableNodeData {
  tableName: string;
  fields: Field[];
  module: string;
}

type TableNode = Node<TableNodeData, 'table'>;

export const ERDTableNode = memo(({ id, data, selected }: NodeProps<TableNode>) => {
  const [expanded, setExpanded] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();

  // CRITICAL: Update handle positions after expansion
  useLayoutEffect(() => {
    updateNodeInternals(id);
  }, [expanded, id, updateNodeInternals]);

  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const primaryKey = data.fields.find(f => f.isPrimaryKey);
  const foreignKeys = data.fields.filter(f => f.isForeignKey);

  return (
    <div className={`erd-table ${selected ? 'selected' : ''}`}>
      {/* Primary Key Handle */}
      {primaryKey && (
        <Handle
          type="source"
          position={Position.Right}
          id="pk"
          style={{ top: '30px', background: '#10b981' }}
        />
      )}

      {/* Table Header */}
      <div className="table-header" onClick={handleToggle}>
        <span className="table-name">{data.tableName}</span>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* Fields List */}
      {expanded && (
        <div className="fields-list">
          {data.fields.map((field, index) => (
            <div key={field.id} className="field-row">
              {field.isForeignKey && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={field.id}
                  style={{
                    top: `${70 + index * 28}px`,
                    background: '#3b82f6'
                  }}
                />
              )}

              <span className="field-icon">
                {field.isPrimaryKey && '🔑'}
                {field.isForeignKey && '🔗'}
              </span>
              <span className="field-name">{field.name}</span>
              <span className="field-type">{field.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Shallow comparison - only re-render if id or selected changed
  return prev.id === next.id && prev.selected === next.selected;
});
```

### 9.2 Complete Flow Setup with Zustand

```typescript
import { create } from 'zustand';
import {
  Node, Edge, applyNodeChanges, applyEdgeChanges,
  addEdge, NodeChange, EdgeChange, Connection
} from '@xyflow/react';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  expandTable: (tableId: string) => void;
  collapseTable: (tableId: string) => void;
  layoutNodes: (direction: 'TB' | 'LR') => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  expandTable: (tableId) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === tableId
          ? { ...node, data: { ...node.data, expanded: true } }
          : node
      )
    });
  },

  collapseTable: (tableId) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === tableId
          ? { ...node, data: { ...node.data, expanded: false } }
          : node
      )
    });
  },

  layoutNodes: (direction) => {
    const { nodes, edges } = get();
    const layouted = getLayoutedElements(nodes, edges, direction);
    set({ nodes: layouted.nodes, edges: layouted.edges });
  },
}));
```

### 9.3 Performance-Optimized Flow Container

```tsx
import ReactFlow, {
  Background, Controls, MiniMap, Panel
} from '@xyflow/react';
import { useFlowStore } from './store';

const nodeTypes = {
  table: ERDTableNode,
  moduleGroup: ModuleGroupNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

export const FlowContainer = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, layoutNodes } =
    useFlowStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onlyRenderVisibleElements={true} // Performance
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
    >
      <Background />

      <Controls position="top-right">
        <button onClick={() => layoutNodes('TB')}>⬇️ Vertical</button>
        <button onClick={() => layoutNodes('LR')}>➡️ Horizontal</button>
      </Controls>

      <MiniMap
        nodeColor={(node) => node.type === 'table' ? '#3b82f6' : '#10b981'}
        position="bottom-right"
        pannable
        zoomable
      />

      <Panel position="top-left">
        <div className="flow-stats">
          {nodes.length} tables • {edges.length} relationships
        </div>
      </Panel>
    </ReactFlow>
  );
};
```

---

## 10. Implementation Recommendations for Foundry

### 10.1 Priority Order

1. **Start with Basic Node/Edge Setup** (Week 1)
   - Implement ERD table node with static fields
   - Basic relationship edges with labels
   - Zustand state management

2. **Add Collapsible Functionality** (Week 2)
   - Implement expand/collapse with `useLayoutEffect`
   - Dynamic handle positioning
   - Performance memoization

3. **Integrate Dagre Layout** (Week 3)
   - Basic vertical layout
   - Animated transitions
   - Manual layout triggers

4. **Performance Optimization** (Week 4)
   - Enable virtualization
   - Optimize memoization
   - Batch updates

5. **Hierarchical Grouping** (Week 5)
   - Module container nodes
   - Collapsible groups
   - Sub-flow layout

### 10.2 Performance Targets

| Node Count | Target FPS | Optimizations Required |
|------------|------------|------------------------|
| < 50 | 60 FPS | Basic memoization |
| 50-200 | 45+ FPS | Virtualization + selective re-renders |
| 200-500 | 30+ FPS | + Hierarchical collapse |
| 500+ | 20+ FPS | + Level-of-detail rendering |

### 10.3 Testing Strategy

**Critical Test Cases:**
1. Expand/collapse 20 tables rapidly - edges should follow handles
2. Pan/zoom with 100+ nodes - should maintain 30+ FPS
3. Layout recalculation with mixed node sizes
4. Multiple edges between same nodes - no overlap
5. Parent-child node drag - children should follow parent
6. Viewport save/restore - exact position maintained

**Performance Profiling:**
```jsx
// Add to development build
const ProfilerCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log({
    id,
    phase,
    actualDuration,
    renderCount: Math.round(actualDuration / 16.67)
  });
};

<Profiler id="ReactFlow" onRender={ProfilerCallback}>
  <ReactFlow ... />
</Profiler>
```

### 10.4 Known Limitations

1. **Dagre Sub-flow Bug**: Cannot mix parent-child nodes with external edges in same layout pass
2. **Edge Bundling**: No built-in support - requires custom implementation
3. **Node Dimensions**: Must render before layout - requires two-pass approach
4. **MiniMap Performance**: Degrades with 100+ nodes - consider disabling
5. **TypeScript Generics**: Deep nesting can cause compilation issues

---

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
1. Collapsible nodes with dynamic handles (`useLayoutEffect` timing)
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
