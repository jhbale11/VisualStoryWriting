# Simple Workflow Engine

## Overview

This translation system uses a **custom browser-native workflow engine** inspired by LangGraph but without Node.js dependencies like `AsyncLocalStorage`.

## Why Not LangGraph?

LangGraph (`@langchain/langgraph`) relies on Node.js's `async_hooks` module (specifically `AsyncLocalStorage`), which is not available in browser environments. Even with polyfills, this can cause issues.

Our `SimpleWorkflow` provides:
- ✅ Browser-native execution (no Node.js APIs)
- ✅ State management with partial updates
- ✅ Conditional routing based on state
- ✅ Sequential node execution
- ✅ Error handling and recovery
- ✅ Progress callbacks

## Architecture

### Core Concepts

```typescript
// Define your state type
interface MyState {
  input: string;
  result?: string;
  count: number;
  error?: string;
}

// Create workflow
import { createWorkflow, START, END } from './SimpleWorkflow';

const workflow = createWorkflow<MyState>();
```

### Nodes

Nodes are async functions that take state and return partial updates:

```typescript
const processNode = async (state: MyState): Promise<Partial<MyState>> => {
  // Do some processing
  const result = await someAsyncOperation(state.input);
  
  return {
    result: result,
    count: state.count + 1,
  };
};

workflow.addNode('process', processNode);
```

### Edges

**Simple edges** connect two nodes directly:

```typescript
workflow.addEdge(START, 'process');
workflow.addEdge('process', 'next');
workflow.addEdge('next', END);
```

**Conditional edges** route based on state:

```typescript
const shouldRetry = (state: MyState): string => {
  if (state.error && state.count < 3) {
    return 'retry';
  }
  return 'end';
};

workflow.addConditionalEdges(
  'process',
  shouldRetry,
  {
    retry: 'process',  // Loop back
    end: END,          // Exit
  }
);
```

### Compilation and Execution

```typescript
// Compile the workflow
const compiled = workflow.compile();

// Execute with initial state
const result = await compiled.invoke({
  input: 'Hello',
  count: 0,
});

console.log(result);
// { input: 'Hello', result: '...', count: 1 }
```

### Streaming with Progress

```typescript
const result = await compiled.stream(
  { input: 'Hello', count: 0 },
  (nodeName, state) => {
    console.log(`Completed ${nodeName}:`, state);
    // Update UI progress here
  }
);
```

## Translation Workflow Example

Our translation pipeline uses SimpleWorkflow:

```typescript
const workflow = createWorkflow<TranslationState>();

// Add processing nodes
workflow.addNode('translate', translateNode);
workflow.addNode('enhance', enhanceNode);
workflow.addNode('quality_check', qualityCheckNode);
workflow.addNode('proofread', proofreadNode);
workflow.addNode('layout', layoutNode);

// Linear flow
workflow.addEdge(START, 'translate');
workflow.addEdge('translate', 'enhance');

// Conditional: run quality check?
workflow.addConditionalEdges(
  'enhance',
  (state) => state.enableQuality ? 'quality_check' : 'proofread',
  {
    quality_check: 'quality_check',
    proofread: 'proofread',
  }
);

// Conditional: re-enhance if quality fails?
workflow.addConditionalEdges(
  'quality_check',
  (state) => {
    if (state.needsReenhancement) return 'enhance';
    return 'proofread';
  },
  {
    enhance: 'enhance',
    proofread: 'proofread',
  }
);

workflow.addEdge('proofread', 'layout');
workflow.addEdge('layout', END);

const graph = workflow.compile();
```

### Workflow Diagram

```
START
  ↓
translate
  ↓
enhance
  ↓
  ├─→ quality_check ──→ enhance (if fails)
  │         ↓
  └────→ proofread
           ↓
         layout
           ↓
          END
```

## Features

### 1. State Merging

State updates are merged, not replaced:

```typescript
// Initial state
{ count: 0, name: 'Alice' }

// Node returns
{ count: 1 }

// Result
{ count: 1, name: 'Alice' }
```

### 2. Error Handling

Errors are caught and added to state:

```typescript
const riskyNode = async (state: MyState) => {
  throw new Error('Something went wrong');
};

// State after error:
// { ...originalState, error: 'Something went wrong' }
```

### 3. Infinite Loop Prevention

If an error occurs, the workflow automatically routes to END:

```typescript
// Prevents getting stuck in retry loops
if (currentState.error && currentNode !== END) {
  currentNode = END;
}
```

### 4. Type Safety

Full TypeScript support:

```typescript
interface MyState {
  input: string;
  output?: string;
}

// ✅ Type-checked
workflow.addNode('process', async (state: MyState) => {
  return { output: state.input.toUpperCase() };
});

// ❌ Type error: wrong return type
workflow.addNode('bad', async (state: MyState) => {
  return { wrong: 123 };  // Error: not in MyState
});
```

## Comparison with LangGraph

| Feature | LangGraph | SimpleWorkflow |
|---------|-----------|----------------|
| State Management | ✅ | ✅ |
| Conditional Edges | ✅ | ✅ |
| Node Execution | ✅ | ✅ |
| Browser Support | ❌ (needs polyfills) | ✅ (native) |
| AsyncLocalStorage | ✅ Uses | ❌ Not needed |
| Streaming | ✅ | ✅ |
| Checkpointing | ✅ | ❌ |
| Time Travel | ✅ | ❌ |
| Parallel Execution | ✅ | ❌ (sequential only) |

## Implementation Details

### How It Works

1. **Start**: Find edge from START
2. **Execute**: Run current node with state
3. **Merge**: Merge returned updates into state
4. **Route**: Determine next node (edge or condition)
5. **Repeat**: Continue until END reached
6. **Return**: Final state

### Safety Features

- **Null checks**: Validates nodes and edges exist
- **Error recovery**: Catches exceptions, continues workflow
- **Loop detection**: Automatically breaks on error
- **Type validation**: TypeScript ensures state consistency

## Best Practices

### 1. Keep Nodes Pure

Nodes should be deterministic:

```typescript
// ✅ Good: deterministic
const processNode = async (state: MyState) => {
  return { result: state.input.toUpperCase() };
};

// ❌ Bad: side effects outside state
const badNode = async (state: MyState) => {
  localStorage.setItem('key', state.input);  // Side effect!
  return { result: 'ok' };
};
```

### 2. Use Partial Returns

Only return what changed:

```typescript
// ✅ Good: minimal updates
return { count: state.count + 1 };

// ❌ Bad: unnecessary full state
return { ...state, count: state.count + 1 };
```

### 3. Handle Errors Gracefully

Return error in state, don't throw:

```typescript
// ✅ Good: error in state
try {
  const result = await riskyOperation();
  return { result };
} catch (error) {
  return { error: error.message };
}

// ❌ Bad: unhandled throw
const result = await riskyOperation();  // May crash workflow
return { result };
```

### 4. Use Meaningful Node Names

```typescript
// ✅ Good: descriptive
workflow.addNode('validate_input', validateNode);
workflow.addNode('fetch_data', fetchNode);
workflow.addNode('transform_result', transformNode);

// ❌ Bad: unclear
workflow.addNode('step1', validateNode);
workflow.addNode('step2', fetchNode);
```

## Debugging

### Enable Logging

```typescript
const result = await compiled.stream(
  initialState,
  (nodeName, state) => {
    console.log(`[${nodeName}]`, state);
  }
);
```

### Inspect State at Each Step

```typescript
const states: Record<string, MyState> = {};

await compiled.stream(
  initialState,
  (nodeName, state) => {
    states[nodeName] = { ...state };
  }
);

console.log('All states:', states);
```

### Check Routing

Add logging to conditional functions:

```typescript
const router = (state: MyState): string => {
  const next = state.error ? 'retry' : 'done';
  console.log(`Routing to: ${next}`, state);
  return next;
};
```

## License

This workflow engine is part of the Visual Story Writing project and follows the same license.



