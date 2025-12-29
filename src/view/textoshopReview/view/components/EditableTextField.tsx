import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RxCornerBottomRight } from "react-icons/rx";
import { BaseRange, Editor, Location, NodeMatch, Point, RangeMode, Transforms, createEditor } from "slate";
import { Editable, ReactEditor, RenderLeafProps, Slate, withReact } from "slate-react";
import { MoveableTextField, textFieldEditors, tools, useModelStore } from "../../model/Model";
import { SelectionTool } from "../../model/tools/toolbarTools/SelectionTool";
import { ToolTextSelectionEvent } from "../../model/tools/toolbarTools/ToolbarTool";
import { TextLayerUtils } from "../../model/utils/TextLayerUtils";
import { DraggingParameters, useViewModelStore } from "../../model/ViewModel";
import { useStudyStore } from "../../model/StudyStub";
import { SelectedText } from "./SelectedText";
import TextSelection from "./TextSelection";


/**
 * Dirty hack to prevent the application from crashing when the selection is not valid during rendering
 */
const originalToDOMRange = ReactEditor.toDOMRange;
ReactEditor.toDOMRange = ((editor: ReactEditor, range: BaseRange) => {
    try {
        const resultRange = originalToDOMRange.apply(ReactEditor, [editor, range]);
        return resultRange;
    } catch (e) {
        // Whatever happens, we should not crash the application. Instead, we reset the selection of the editor if it is invalid
        if (editor.selection && Point.equals(editor.selection.anchor, range.anchor) && Point.equals(editor.selection.focus, range.focus)) {
            editor.selection = null;
        }
        return null;
    }
}) as any;



export let useOriginalRemoveNodes = false;
const originalRemoveNodes = Transforms.removeNodes;
Transforms.removeNodes = ((editor: Editor, options?: {
    at?: Location;
    match?: NodeMatch<any>;
    mode?: RangeMode;
    hanging?: boolean;
    voids?: boolean;
}) => {
    // We need to make sure we are in the specific case of a node with a tag
    if (!useOriginalRemoveNodes && !(Transforms as any).removeEmptyNodes && options && options.at) {
        const [node] = Editor.node(editor, options.at) as any;

        if (node.layerTagId !== undefined && node.text === "") {
            // Count how many nodes are there with the layerTagId
            let count = 0;
            const nodes = Editor.nodes(editor, { at: [], mode: 'all', match: (n: any) => n.layerTagId === node.layerTagId });
            for (const [node, path] of nodes) {
                count++;
            }

            // If this is the only node with this tag, we prevent the tag from being removed
            return;
        }
    }

    originalRemoveNodes.apply(Transforms, [editor, options]);

}) as any;

const Leaf = (props: any) => {
    if (props.leaf.selection && props.leaf.selectionClassname === "textSelection") {
        return <SelectedText leaf={props.leaf} editor={props.editor} id={"selection"} className={"selectedText"}>{props.children}</SelectedText>
    } else if (props.leaf.test) {
        return <span style={{ background: 'red' }} {...props.attributes}>{props.children}</span>
    } else if (props.leaf.horizontalLine) {
        return <span style={{ borderBottom: '1px solid black', display: 'block', margin: '5px 0' }} {...props.attributes}>{props.children}</span>
    }

    const classes = [];
    const style = {};

    // If the node is part of a layer, we should show the layer's colour on hover
    if (props.leaf.layerTagId) {
        // Retrieve the layer that contains this tag
        TextLayerUtils.flattenHierarchicalLayers(useModelStore.getState().layers).forEach((hlayer) => {
            const layer = hlayer.layer;
            if (layer.isVisible && props.leaf.layerTagId + "" in layer.modifications) {
                classes.push("layer-tag");
                classes.push("belong-to-layer-" + hlayer.id);
                (style as any)['--layer-color'] = layer.color;
            }
        });
    }

    if (props.leaf.removed) {
        classes.push("textRemoval");
    } else if (props.leaf.added) {
        classes.push("textAddition");
    } else if (props.leaf.selectionClassname) {
        classes.push(props.leaf.selectionClassname);
        classes.push("loading"); // Those are always loading
        const tone = useModelStore.getState().tone;
        (style as any)['--tone-color'] = `${tone[0].value / 10 * 255}, ${tone[1].value / 10 * 255}, ${tone[2].value / 10 * 255}`;
    }

    // Non-intrusive review overlays drawn via background gradient using global window.reviewOverlays
    try {
        const overlays = (window as any).reviewOverlays && (window as any).reviewOverlays[props.editor?.id || 'translationField']
        if (overlays && Array.isArray(overlays)) {
            const text = props.children?.props?.text?.text as string || ''
            if (text && text.length > 0) {
                // For simplicity, if any overlay exists, use subtle underline, tooltip via title
                // Precise per-span mapping is complex; keep non-blocking styling
                (style as any).backgroundImage = (style as any).backgroundImage || 'linear-gradient(transparent, transparent)'
                if (!props.attributes?.title) (props.attributes as any).title = props.leaf.selectionTooltip
            }
        }
    } catch { }

    // By default we just render a basic span
    return <span style={style} className={classes.join(" ")} {...props.attributes}>{props.children}</span>
}


export default function EditableTextField(props: { style?: React.CSSProperties, isMoveable?: boolean, textField: MoveableTextField, className?: string }) {
    const selectedToolStr = useModelStore(state => state.selectedTool);
    const selectedTool = tools[selectedToolStr];
    const [isLoading, setIsLoading] = useState(false);
    const startDragging = useViewModelStore(state => state.startDragging);
    const dragging = useViewModelStore(state => state.dragging);
    const inMultipleSelectionMode = useModelStore(state => state.inMultipleSelectionMode);
    const [isResizing, setIsResizing] = useState(false);
    const textFieldDivRef = React.createRef<HTMLDivElement>();

    const selectedTexts = useModelStore(state => state.selectedTexts);
    const setSelectedTexts = useModelStore(state => state.setSelectedTexts);

    const setTextFields = useModelStore(state => state.setTextFields);

    const isDragging = useViewModelStore(state => state.dragging);

    const editor = useMemo(() => {
        const instance = withReact(createEditor())

        const { normalizeNode } = instance

        instance.normalizeNode = entry => {
            const [node, path] = entry

            if (path.length === 0) { // Root node
                const paragraphs = (node as any).children;

                // Allow multiple paragraphs - DO NOT merge them
                // This enables proper paragraph structure with \n\n separation
                // The original code was forcing single paragraph, which broke paragraph matching

                // Ensure at least one paragraph exists
                if (paragraphs.length === 0) {
                    Transforms.insertNodes(instance, {
                        type: 'paragraph',
                        children: [{ text: '' }]
                    } as any, { at: [0] });
                    return;
                }
            }

            // Fallback to the original `normalizeNode` to enforce other constraints.
            normalizeNode(entry)
        }
        return instance;
    }, []);




    textFieldEditors[props.textField.id] = editor;
    const textField = props.textField;

    const renderLeaf = useCallback((props: RenderLeafProps) => {
        return <Leaf {...props} editor={editor} />
    }, [])
    const selectionOverlayMode = selectedTool?.selectionOverlayMode ? selectedTool.selectionOverlayMode() : (selectedTool?.enableSelectionOverlay ? (selectedTool.enableSelectionOverlay() ? "full" : "disabled") : "full");
    const selectionOverlayEnabled = selectionOverlayMode !== "disabled";
    const selectionOverlayVisualOnly = selectionOverlayMode === "visual-only";


    const mouseDownListener = (e: React.MouseEvent) => {
        if (!inMultipleSelectionMode) {
            setSelectedTexts([]);
        }
    }

    const onTextSelected = (selectionRange: Range) => {
        const selection = editor.selection;
        const selectionLength = Math.abs(selection ? selection.anchor.offset - selection.focus.offset : 0);

        if (selectionLength === 0) return;

        // For some reason, we need to do this so that Slate registers the snapped selection
        const slateSelectionRange = ReactEditor.toSlateRange(editor, selectionRange, { exactMatch: false, suppressThrow: true });
        if (slateSelectionRange) {
            const selectionId = selectedTexts.length;
            const event: ToolTextSelectionEvent = {
                editor: editor,
                range: selectionRange,
                slateRange: slateSelectionRange,
                preventTextSelection: false,
                selectionid: selectionId,
                precedingRange: ReactEditor.toDOMRange(editor, Editor.range(editor, Editor.start(editor, []), slateSelectionRange.anchor)),
                followingRange: ReactEditor.toDOMRange(editor, Editor.range(editor, slateSelectionRange.focus, Editor.end(editor, [])))
            }

            useStudyStore.getState().logEvent("TEXT_SELECTED", { range: selectionRange.toString(), tool: selectedTool.name });
            useModelStore.getState().getSelectedTool().onTextSelected(event);

            if (!event.preventTextSelection) {
                editor.select(slateSelectionRange);
                editor.addMark("selection", true);
                editor.addMark("selectionId", selectionId);
                editor.addMark("selectionClassname", useModelStore.getState().getSelectedTool().getMarksClassname());
                editor.deselect();

                // If this is a selection, we should also reset the tones
                if (useModelStore.getState().selectedTool === SelectionTool.getToolName()) {
                    useModelStore.getState().setTone(
                        useModelStore.getState().tone.map(e => ({ ...e, value: 5 }))
                    )
                }
            }
        }
    }

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (e.button === 0 && isResizing && textFieldDivRef.current) {
                const rect = textFieldDivRef.current.getBoundingClientRect();
                const width = Math.max(70, e.clientX - rect.left);
                const height = e.clientY - rect.top;

                // Modify the DOM directly (avoids triggering a react render)
                textFieldDivRef.current.style.width = width + 'px';
                textFieldDivRef.current.style.minHeight = height + 'px';
            }
        }

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 0 && isResizing) {
                setIsResizing(false);
                // Save the new size of the text field in the model
                const rect = textFieldDivRef.current?.getBoundingClientRect();
                if (rect) {
                    useModelStore.getState().setTextField(props.textField.id, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                }
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
    }, [isResizing]);

    const onMouseDownForDragging = (e: React.MouseEvent) => {
        if (textFieldDivRef.current && props.isMoveable && !dragging && e.buttons === 1) {
            const rect = textFieldDivRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const draggingParameters: DraggingParameters = {
                elementId: props.textField.id,
                offsetX: offsetX, offsetY: offsetY, cloned: false,
                initialX: e.clientX, initialY: e.clientY,
                initialStyle: { position: textFieldDivRef.current.style.position, opacity: textFieldDivRef.current.style.opacity, left: textFieldDivRef.current.style.left, top: textFieldDivRef.current.style.top, zIndex: textFieldDivRef.current.style.zIndex },
                onElementDropped: (draggingParameters, element) => {
                    // Update the position of the text field in the model
                    const rect = element?.getBoundingClientRect();
                    if (rect) {
                        useStudyStore.getState().logEvent("TEXTFIELD_MOVED", { text: document.getElementById(props.textField.id)?.innerText, x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                        useModelStore.getState().setTextField(props.textField.id, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
                    }
                }
            };
            startDragging([draggingParameters])
        }
    }



    const tone = useModelStore.getState().tone;
    const style = {};
    (style as any)['--tone-color'] = `${tone[0].value / 10 * 255}, ${tone[1].value / 10 * 255}, ${tone[2].value / 10 * 255}`;

    if (props.isMoveable && props.style) {
        props.style.padding = "0px 0px 0px 15px"
    }

    return (
        <div ref={textFieldDivRef} className={props.className + " editableTextField" + (props.isMoveable ? " isMoveableTextField" : "")} id={props.textField.id}
            style={{ position: 'absolute', boxShadow: 'rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px', borderRadius: 4, /*padding: 10,*/ left: textField.x, top: textField.y, minHeight: textField.height, width: textField.width, background: 'white', /*cursor: props.isMoveable ? 'pointer' : undefined,*/ ...props.style }}>
            {/* Drag handle with a dot pattern to show it is draggable */}
            {props.isMoveable && <div
                onMouseDown={onMouseDownForDragging}
                style={{ position: 'absolute', left: 0, top: 0, width: 17, height: '100%', zIndex: 1000, cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                    style={{
                        marginLeft: 2, width: 13, height: 24,
                        background: 'radial-gradient(#999 35%, transparent 0px) 0% 0% / 6px 6px white'
                    }}
                />
            </div>}
            <TextSelection
                disabled={isDragging || !selectionOverlayEnabled}
                visualOnly={selectionOverlayVisualOnly}
                opaque={selectionOverlayEnabled && !selectionOverlayVisualOnly && selectedTool.isSelectionOpaque()}
                className={selectionOverlayEnabled ? selectedTool.getMarksClassname() : ""}
                style={style}
                onTextSelected={selectionOverlayEnabled && !selectionOverlayVisualOnly ? onTextSelected : undefined}
            >
                <div style={{ userSelect: isDragging ? 'none' : undefined }} className={"textEditor " + (isLoading ? "loading" : "")}>
                    <Slate data-gramm={false} data-gramm_editor={false} data-enable-grammarly={false} editor={editor} initialValue={textField.state} onChange={newValue => {
                        (Transforms as any).removeEmptyNodes = true;
                        setTextFields(useModelStore.getState().textFields.map(e => e.id === props.textField.id ? { ...e, state: newValue } : e));
                        (Transforms as any).removeEmptyNodes = false;
                    }}>
                        <Editable data-gramm={false} data-gramm_editor={false} data-enable-grammarly={false} style={{ userSelect: isDragging ? 'none' : undefined, padding: props.isMoveable ? 5 : 0 }} readOnly={isDragging} renderLeaf={renderLeaf} onMouseDown={mouseDownListener} />
                    </Slate>
                </div>
            </TextSelection>
            {props.isMoveable && <div style={{ position: 'absolute', right: 0, bottom: 0, cursor: 'nwse-resize' }}
                onMouseDown={(e) => {
                    if (props.isMoveable && !dragging) {
                        setIsResizing(true);
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }}>
                <RxCornerBottomRight />
            </div>}
        </div>
    )
}