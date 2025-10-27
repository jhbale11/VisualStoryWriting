import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, useInternalNode, useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import '@xyflow/react/dist/style.css';
import { useModelStore } from '../../model/Model';
import { getEdgeParams } from '../utils/initialElements';

type RelationshipData = {
  relationship: string;
  description?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export default function RelationshipEdgeComponent(props: EdgeProps<any>) {
  const sourceNode = useInternalNode(props.source);
  const targetNode = useInternalNode(props.target);
  const { getEdges } = useReactFlow();

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );

  let [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  const selectedEdges = useModelStore(state => state.selectedEdges);

  const isSelected = selectedEdges.includes(props.id);

  const allEdges = getEdges();
  const overlappingEdges = useMemo(() => allEdges.filter(e => e.source === props.source && e.target === props.target), [allEdges, props.source, props.target]);
  const inverseEdges = useMemo(() => allEdges.filter(e => e.source === props.target && e.target === props.source), [allEdges, props.source, props.target]);

  const isGoingBackwards = props.sourceX > props.targetX;
  const currentEdgeIndex = overlappingEdges.findIndex(edge => edge.id === props.id);
  const isLastOverlappingEdge = currentEdgeIndex === overlappingEdges.length - 1;

  const isFaded = false;

  const color = (props.data as RelationshipData)?.sentiment === 'negative' ? '#ef4444' : (props.data as RelationshipData)?.sentiment === 'positive' ? '#22c55e' : '#6b7280';

  if (props.source === props.target) {
    const radiusX = (props.sourceX - props.targetX) * 0.6;
    const radiusY = 50;
    edgePath = `M ${props.sourceX - 5} ${props.sourceY} A ${radiusX} ${radiusY} 0 1 0 ${props.targetX + 2} ${props.targetY}`;
    labelX = (props.sourceX + props.targetX) / 2;
    labelY = props.sourceY + (props.sourceY > props.targetY ? -radiusY * 1.5 : radiusY * 1.5);
  }

  let labelPositionTransform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`
  if (inverseEdges.length > 0) {
    if (isGoingBackwards) {
      labelPositionTransform = `translate(-50%, -105%) translate(${labelX}px,${labelY}px)`
    } else {
      labelPositionTransform = `translate(-50%, 5%) translate(${labelX}px,${labelY}px)`
    }
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={{ ...(props.markerEnd as any), color }}
        style={{ ...props.style, stroke: color, strokeWidth: 3, cursor: 'pointer', opacity: isFaded ? 0.3 : 1 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            display: isLastOverlappingEdge || isSelected ? 'flex' : 'none',
            transform: labelPositionTransform,
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: isSelected ? 9999 : 0,
            background: 'white',
            color: color,
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '2px 4px',
          }}
        >
          {(props.data as RelationshipData)?.relationship}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}


