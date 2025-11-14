/**
 * Simple Workflow Engine
 * 
 * A lightweight workflow engine that doesn't rely on AsyncLocalStorage.
 * Provides similar functionality to LangGraph's StateGraph but browser-compatible.
 */

export type WorkflowNode<TState> = (state: TState) => Promise<Partial<TState>>;
export type ConditionalRouter<TState> = (state: TState) => string;

interface EdgeConfig {
  from: string;
  to: string | string[];
  condition?: ConditionalRouter<any>;
  mapping?: Record<string, string>;
}

export const START = '__start__';
export const END = '__end__';

export class SimpleWorkflow<TState extends Record<string, any>> {
  private nodes: Map<string, WorkflowNode<TState>> = new Map();
  private edges: EdgeConfig[] = [];
  private conditionalEdges: Map<string, { condition: ConditionalRouter<TState>; mapping: Record<string, string> }> = new Map();

  constructor() {}

  /**
   * Add a processing node to the workflow
   */
  addNode(name: string, node: WorkflowNode<TState>): this {
    this.nodes.set(name, node);
    return this;
  }

  /**
   * Add a simple edge between two nodes
   */
  addEdge(from: string, to: string): this {
    this.edges.push({ from, to });
    return this;
  }

  /**
   * Add a conditional edge that routes based on state
   */
  addConditionalEdges(
    from: string,
    condition: ConditionalRouter<TState>,
    mapping: Record<string, string>
  ): this {
    this.conditionalEdges.set(from, { condition, mapping });
    return this;
  }

  /**
   * Compile and return the executable workflow
   */
  compile(): CompiledWorkflow<TState> {
    return new CompiledWorkflow(this.nodes, this.edges, this.conditionalEdges);
  }
}

class CompiledWorkflow<TState extends Record<string, any>> {
  constructor(
    private nodes: Map<string, WorkflowNode<TState>>,
    private edges: EdgeConfig[],
    private conditionalEdges: Map<string, { condition: ConditionalRouter<TState>; mapping: Record<string, string> }>
  ) {}

  /**
   * Execute the workflow with the given initial state
   */
  async invoke(initialState: TState): Promise<TState> {
    let currentState = { ...initialState };
    
    // Find the starting node (edge from START)
    const startEdge = this.edges.find(e => e.from === START);
    if (!startEdge || typeof startEdge.to !== 'string') {
      throw new Error('No valid start edge found');
    }

    let currentNode = startEdge.to;

    // Execute nodes until we reach END
    while (currentNode !== END) {
      // Execute current node
      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node ${currentNode} not found`);
      }

      try {
        const updates = await node(currentState);
        currentState = { ...currentState, ...updates };
      } catch (error) {
        console.error(`Error in node ${currentNode}:`, error);
        currentState = {
          ...currentState,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        // Continue to allow error handling in subsequent nodes
      }

      // Determine next node
      const conditionalEdge = this.conditionalEdges.get(currentNode);
      if (conditionalEdge) {
        // Use conditional routing
        const nextKey = conditionalEdge.condition(currentState);
        const nextNode = conditionalEdge.mapping[nextKey];
        
        if (!nextNode) {
          throw new Error(`No mapping found for condition result: ${nextKey}`);
        }
        
        currentNode = nextNode;
      } else {
        // Use simple edge
        const edge = this.edges.find(e => e.from === currentNode);
        if (!edge) {
          throw new Error(`No edge found from node ${currentNode}`);
        }
        
        if (typeof edge.to !== 'string') {
          throw new Error(`Invalid edge configuration for node ${currentNode}`);
        }
        
        currentNode = edge.to;
      }

      // Safety check to prevent infinite loops
      if (currentState.error && currentNode !== END) {
        // If there's an error and we're not at the end, continue to END
        currentNode = END;
      }
    }

    return currentState;
  }

  /**
   * Stream execution with progress callbacks
   */
  async stream(
    initialState: TState,
    onNodeComplete?: (nodeName: string, state: TState) => void
  ): Promise<TState> {
    let currentState = { ...initialState };
    
    const startEdge = this.edges.find(e => e.from === START);
    if (!startEdge || typeof startEdge.to !== 'string') {
      throw new Error('No valid start edge found');
    }

    let currentNode = startEdge.to;

    while (currentNode !== END) {
      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node ${currentNode} not found`);
      }

      try {
        const updates = await node(currentState);
        currentState = { ...currentState, ...updates };
        
        if (onNodeComplete) {
          onNodeComplete(currentNode, currentState);
        }
      } catch (error) {
        console.error(`Error in node ${currentNode}:`, error);
        currentState = {
          ...currentState,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Determine next node
      const conditionalEdge = this.conditionalEdges.get(currentNode);
      if (conditionalEdge) {
        const nextKey = conditionalEdge.condition(currentState);
        const nextNode = conditionalEdge.mapping[nextKey];
        
        if (!nextNode) {
          throw new Error(`No mapping found for condition result: ${nextKey}`);
        }
        
        currentNode = nextNode;
      } else {
        const edge = this.edges.find(e => e.from === currentNode);
        if (!edge) {
          throw new Error(`No edge found from node ${currentNode}`);
        }
        
        if (typeof edge.to !== 'string') {
          throw new Error(`Invalid edge configuration for node ${currentNode}`);
        }
        
        currentNode = edge.to;
      }

      if (currentState.error && currentNode !== END) {
        currentNode = END;
      }
    }

    return currentState;
  }
}

/**
 * Create a new workflow
 */
export function createWorkflow<TState extends Record<string, any>>(): SimpleWorkflow<TState> {
  return new SimpleWorkflow<TState>();
}



