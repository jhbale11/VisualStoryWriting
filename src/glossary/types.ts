import type { GlossarySnapshot } from '../model/GlossaryModel';
import type { EntityNode, ActionEdge, LocationNode } from '../model/Model';

export interface GlossaryViewState {
  entityNodes: EntityNode[];
  actionEdges: ActionEdge[];
  locationNodes: LocationNode[];
  textState: any;
  isReadOnly: boolean;
  relationsPositions?: Record<string, { x: number; y: number }>;
}

export interface GlossaryProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  glossary?: GlossarySnapshot;
  view?: GlossaryViewState;
  status?: 'pending' | 'processing' | 'ready';
}

