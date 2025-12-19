import { Button, Card, CardBody, CardHeader, Divider, Tooltip } from "@nextui-org/react";
import { NodeApi, NodeRendererProps, Tree } from "react-arborist";
import { Editor, Node, Transforms } from "slate";
import { HiearchicalLayer, useModelStore } from "../../model/Model";
import { TextLayerUtils } from "../../model/utils/TextLayerUtils";

import { BiSolidLayerPlus } from "react-icons/bi";
import { FaTrashAlt } from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { MdTextSnippet } from "react-icons/md";
import { RiEyeCloseFill, RiEyeFill } from "react-icons/ri";
import useResizeObserver from "use-resize-observer";
import { useUndoModelStore } from "../../model/UndoModel";
import { editSlateState } from "../../model/utils/TextUtils";


export const LAYER_COLOR_PALETTE = ["#1f78b4", "#ff7f00", "#33a02c", "#e31a1c", "#6a3d9a", "#a6cee3", "#b2df8a", "#fb9a99", "#fdbf6f", "#cab2d6", "#ffff99", "#b15928"];
export let layerColorIndex = 0;



function Input({ node }: { node: NodeApi<HiearchicalLayer> }) {
  const doNothing = (e : any) => {
    e.stopPropagation();
    //e.preventDefault();
  }
  return (
    <input
      autoFocus
      type="text"
      defaultValue={node.data.layer.name}
      onMouseMove={doNothing}
      onMouseDown={doNothing}
      onDrag={doNothing}
      onDragStart={doNothing}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => node.submit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") node.reset();
        if (e.key === "Enter") node.submit(e.currentTarget.value);
      }}
    />
  );
}

function FolderArrow({ node }: { node: NodeApi<HiearchicalLayer> }) {
  return (
    <>
      {node.isOpen && <IoIosArrowDown style={{ opacity: node.data.children && node.data.children.length > 0 ? 1 : 0 }} />}
      {!node.isOpen && <IoIosArrowForward style={{ opacity: node.data.children && node.data.children.length > 0 ? 1 : 0 }} />}
    </>
  );
}

export function LayerListElement(props: NodeRendererProps<HiearchicalLayer>) {
  const animateNextChanges = useModelStore(state => state.animateNextChanges);
  const setLayerVisibility = useModelStore(state => state.setLayerVisibility);
  const selectedLayerId = useModelStore(state => state.selectedLayerId);

  const isSelected = selectedLayerId === (props.node.data.layer as any).layerIndex;
  const isVisible = props.node.data.layer.isVisible;

  return (<div className="group border hover:border-[#3579DE] border-white" 
  style={{ color: isVisible ? "black" : '#AAAEB1', display: 'flex', height: 33, position: 'relative', alignItems: 'center', border: props.preview? '0px solid white' : undefined, background: (isSelected && !props.preview) ? '#E8F4FE' : undefined, borderRadius: 2 }}
  onMouseEnter={() => {
    // We want to highlight the text from that layer. TO do that ,we first retrieve the elements and then give them the class "layer-always-visible"
    const elements = document.getElementsByClassName("belong-to-layer-" + (props.node.data.layer as any).layerIndex);
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.add("layer-always-visible");
    }
  }}

  onMouseLeave={() => {
    const elements = document.getElementsByClassName("belong-to-layer-" + (props.node.data.layer as any).layerIndex);
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.remove("layer-always-visible");
    }
  }}>
    <div ref={props.dragHandle} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <div
        style={{ ...props.style, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 5 }}
        onDoubleClick={(e) => {
          props.node.edit();
        }}
        >
        <div onClick={() => props.node.isInternal && props.node.toggle()}>
           <FolderArrow node={props.node} />
        </div>
        <MdTextSnippet color={isVisible ? props.node.data.layer.color : '#AAAEB1'} size={16} />
        <span>{props.node.isEditing ? <Input node={props.node} /> : props.node.data.layer.name}</span>
      </div>
    </div>
    <button className={props.node.data.layer.isVisible ? "group-[:not(:hover)]:opacity-0" : "opacity-1"} style={{ marginRight: 2, position: 'absolute', right: 5 }}
      onClick={e => {
        useUndoModelStore.getState().setIsDisabled(true);
        animateNextChanges(); // Animate the changes caused by the layers
        setLayerVisibility((props.node.data.layer as any).layerIndex, !props.node.data.layer.isVisible)
        e.stopPropagation();
        useUndoModelStore.getState().setIsDisabled(false);
      }}
    >
      {isVisible && <RiEyeFill />}
      {!isVisible && <RiEyeCloseFill />}
    </button>

  </div>);
}


export function LayerManager() {
  const layers = useModelStore(state => state.layers);
  const flattenedLayers = TextLayerUtils.flattenHierarchicalLayers(layers);
  const setSelectedLayer = useModelStore(state => state.setSelectedLayer);
  const selectedLayerId = useModelStore(state => state.selectedLayerId);
  const { ref, width, height } = useResizeObserver();

  // Add an id to each layer element just to make it easier to figure out their position when they are selected
  flattenedLayers.forEach((e, idx) => {
    (e as any).layer.layerIndex = idx;
    e.id = idx.toString();
  });


  return (<Card style={{ width: 250, }}>
    <CardHeader>
      <span style={{ fontWeight: 600 }}>Layers</span>
    </CardHeader>
    <Divider />
    <CardBody style={{ margin: 0, padding: 0 }}>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
        <Tree data={[...layers].reverse()}
          width={'100%'}
          height={height ? Math.min(height, 33*Math.max(3, flattenedLayers.length)) : 150}
          rowHeight={33}
          className="layer-tree group/tree"
          disableMultiSelection={true}

          onRename={({id, name}) => {
            useUndoModelStore.getState().setIsDisabled(true);
            useModelStore.getState().setLayerProperties(parseInt(id), {name: name});
            useUndoModelStore.getState().setIsDisabled(false);
          }}

          disableDrag={(e) => {
            return e.id === "0"; /* First layer cannot be dragged */
          }}
          disableDrop={({ parentNode, dragNodes, index }) => {
            return ((parentNode.id == '0' && index === 0) || (parentNode.id === "__REACT_ARBORIST_INTERNAL_ROOT__" && index === layers.length )); // Cannot drop above the first layer
          }}
          onDelete={({ ids }) => {
            /*if (ids.length > 0) {
              useModelStore.getState().removeLayer(parseInt(ids[0]));
            }*/
          }}

          onMove={({ dragIds, parentId, index }) => {
            if (dragIds.length > 0) {
              const nbSiblings = (parentId ? layers.find(e => e.id === parentId)?.children?.length : layers.length) || 0;
              const reversedIndex = nbSiblings - index; // Layers are reversed
              useModelStore.getState().moveLayer(parseInt(dragIds[0]), parentId ? parseInt(parentId) : null, reversedIndex);
            }
          }}

          onSelect={(selectedNodes) => {
            if (selectedNodes.length > 0) {
              const node = selectedNodes[0];
              if ((node.data.layer as any).layerIndex !== undefined) {
                setSelectedLayer((node.data.layer as any).layerIndex);
              }
            }
          }}

        >
          {LayerListElement}
        </Tree>
        {/*layers.map((textLayer, index) => {
          return <LayerListElement key={index} textLayer={textLayer} id={index} />
        })*/}
        <div style={{ display: 'flex', justifyContent: 'right', margin: 10, gap: 5 }}>

          <Tooltip placement="bottom" content="Add new layer" closeDelay={0}>
            <Button size="sm" onFocus={(e) => (e.target as any)!.blur()} isIconOnly onClick={() => {

              // First, we figure out where the layer should be added
              const flattenedLayersWithParents = TextLayerUtils.flattenHierarchicalLayersWithParent(layers);
              const selectedLayer = useModelStore.getState().selectedLayerId;
              let selectedLayerInfo = flattenedLayersWithParents[selectedLayer];

              let parentLayerId = null;

              if (selectedLayerInfo.parent) {
                parentLayerId = flattenedLayersWithParents.findIndex(e => e.hlayer.layer === selectedLayerInfo.parent!.hlayer.layer);
              }

              let color = "#" + Math.floor(Math.random() * 16777215).toString(16);

              // Try to find a color from the palette that has not been used yet
              const usedColors = flattenedLayers.map(e => e.layer.color);
              const unusedColors = LAYER_COLOR_PALETTE.filter(e => !usedColors.includes(e));
              if (unusedColors.length > 0) {
                color = unusedColors[0];
              }

              useUndoModelStore.getState().storeUndoState();

             
              const selectedTexts = useModelStore.getState().selectedTexts.filter(e => e.textFieldId === "mainTextField");
              const modifications : {[tag: string]: string} = {};
              if (selectedTexts.length > 0 && useModelStore.getState().selectedLayerId === 0) {
                // We should use the selected text to populate the new layer

                // First, we calculate the new layer 0
                const recoveredFirstLayer = TextLayerUtils.recoverFirstLayerFromState(useModelStore.getState().textFields[0].state, TextLayerUtils.flattenHierarchicalLayersToTextLayer(layers));

                const state = editSlateState(recoveredFirstLayer, (editor) => {
                const nodes = Editor.nodes(editor, { at: [], mode: 'all', match: (n : any) => n.selectionId !== undefined });

                  for (const [node, path] of nodes) { 
                      // Only edit if the text is different
                      const tagId = TextLayerUtils.getUniqueTagId(layers);
                      Transforms.setNodes(editor, { selectionId: undefined, selection: undefined, selectionClassname: undefined, layerTagId: tagId } as any, { at: path });
                      Transforms.insertText(editor, "\0", { at: path });
                      modifications[tagId] = Node.string(node);
                  }
                });

                // Update the first layer to add the tag
                useModelStore.getState().layers[0].layer.state = state;
              }

              const newLayer: HiearchicalLayer = { id: '', layer: { name: 'New layer', color: color, isVisible: true, modifications: modifications }, children: [] };
              useModelStore.getState().addLayer(newLayer, parentLayerId, selectedLayerInfo.indexWithinParent + 1);
            }

            }><BiSolidLayerPlus size={"18"} /></Button>
          </Tooltip>

          <Tooltip placement="bottom" content="Delete selected layer" closeDelay={0}>
            <Button isDisabled={selectedLayerId === 0} onFocus={(e) => (e.target as any)!.blur()} size="sm" isIconOnly onClick={() => {
              const selectedLayer = useModelStore.getState().selectedLayerId;
              useUndoModelStore.getState().storeUndoState();
              useModelStore.getState().removeLayer(selectedLayer);
            }}><FaTrashAlt /></Button>
          </Tooltip>
        </div>
      </div>
    </CardBody>
  </Card>);
}
