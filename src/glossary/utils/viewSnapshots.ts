import { useModelStore } from '../../model/Model';
import type { GlossaryViewState } from '../types';

export const captureViewSnapshot = (): GlossaryViewState => {
  const state = useModelStore.getState();
  return {
    entityNodes: state.entityNodes,
    actionEdges: state.actionEdges,
    locationNodes: state.locationNodes,
    textState: state.textState,
    isReadOnly: state.isReadOnly,
    relationsPositions: JSON.parse(localStorage.getItem('vsw.relations.positions') || '{}'),
  };
};

export const applyViewSnapshot = (snapshot?: GlossaryViewState) => {
  if (!snapshot) return;
  const state = useModelStore.getState();
  if (snapshot.entityNodes) state.setEntityNodes(snapshot.entityNodes);
  if (snapshot.actionEdges) state.setActionEdges(snapshot.actionEdges);
  if (snapshot.locationNodes) state.setLocationNodes(snapshot.locationNodes);
  if (snapshot.textState) state.setTextState(snapshot.textState, true, false);
  if (typeof snapshot.isReadOnly === 'boolean') {
    state.setIsReadOnly(snapshot.isReadOnly);
  }
  if (snapshot.relationsPositions) {
    localStorage.setItem('vsw.relations.positions', JSON.stringify(snapshot.relationsPositions));
  }
};

