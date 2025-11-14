import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { BaseEditor, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { MoveableTextField, TextSelection, useModelStore } from "../../model/Model";
import { TextReorganizer } from "../../model/tools/promptTools/TextReorganizer";
import { TextResizer } from "../../model/tools/promptTools/TextResizer";
import { useUndoModelStore } from "../../model/UndoModel";
import { TextUtils } from "../../model/utils/TextUtils";
import { DraggingParameters, useViewModelStore } from "../../model/ViewModel";
import { useStudyStore } from "../../model/StudyStub";
import { Utils } from "../Utils";

// From tl;draw
const nwRotationCursor = `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='1' dy='1' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(0 16 16)' filter='url(%23shadow)'><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></svg>") 16 16, pointer`
const neRotationCursor = `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='1' dy='-0.9999999999999999' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(90 16 16)' filter='url(%23shadow)'><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></svg>") 16 16, pointer`
const swRotationCursor = `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='-1.0000000000000002' dy='0.9999999999999998' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(270 16 16)' filter='url(%23shadow)'><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></svg>") 16 16, pointer`
const seRotationCursor = `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'><feDropShadow dx='-0.9999999999999999' dy='-1.0000000000000002' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(180 16 16)' filter='url(%23shadow)'><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></svg>") 16 16, pointer`

const lastTextReorganizers : TextReorganizer[] = [];
const lastTextResizers : TextResizer[] = [];

export function SelectedText(props: { children: JSX.Element, id: string, style?: React.CSSProperties, className?: string, ref?: any, editor: BaseEditor & ReactEditor, leaf: any }) {
    const textString = props.children.props.text.text as string;

    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragged, setIsDragged] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const childrenRef = useRef<HTMLSpanElement>(null);
    const rotationHandle = useRef<HTMLDivElement>(null);
    const swHandleRef = useRef<HTMLDivElement>(null);
    const seHandleRef = useRef<HTMLDivElement>(null);
    const [temporaryText, setTemporaryText] = useState(textString);
    const [rotationMarkLevel, setRotationMarkLevel] = useState(0);
    const spacePaddingCharacter = ". "; // Has to use a space otherwise it does not properly wrap
    const [resizingWidth, setResizingWidth] = useState(0);
    const startDragging = useViewModelStore(state => state.startDragging);
    const dragging = useViewModelStore(state => state.dragging);
    const elementId = useId();
    const selectedTexts = useModelStore(state => state.selectedTexts);
    const disableResizing = useStudyStore(state => state.disableResizing);
    const disableDragging = useStudyStore(state => state.disableDragging);

    const animateNextChanges = useModelStore(state => state.animateNextChanges);

    const radius = 50;
    const centerOffset = Math.round(radius / 1.42);
    const rotationLevels = [-135, -90, -45, 0, 45]

    const rotationMarkPositions = rotationLevels.map((angle) => {
        const angleRad = angle * Math.PI / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;
        return {x: x-centerOffset, y: y+centerOffset};
    });


    // Find the corresponding selection in the model
    const selectedText = selectedTexts.find((selection) => selection.selectionId === props.leaf.selectionId);


    if (!isResizing && !isRotating && !isDragged) {
        if (temporaryText !== textString) {
            // This might happen when the selection was modified by a different tool (e.g., tone picker)
            setTemporaryText(textString);
        }
    }

    // First, try to find a text reorganizer instance from the existing ones
    let textReorganizer : TextReorganizer | null = null;
    for (const reorganizer of lastTextReorganizers) {
        if (reorganizer.isValueCached(textString)) {
            textReorganizer = reorganizer;
            break;
        }
    }
    if (textReorganizer === null) {
        textReorganizer = new TextReorganizer(textString);
        lastTextReorganizers.push(textReorganizer);
        // Make sure we don't keep too many text reorganizers
        if (lastTextReorganizers.length > 5) {
            lastTextReorganizers.shift();
        }
    }

    // First, try to find a text resizer instance from the existing ones
    let textResizer : TextResizer | null = null;
    for (const resizer of lastTextResizers) {
        if (resizer.isValueCached(textString)) {
            textResizer = resizer;
            break;
        }
    }
    if (textResizer === null) {
        textResizer = new TextResizer(textString);
        lastTextResizers.push(textResizer);
        // Make sure we don't keep too many text resizers
        if (lastTextResizers.length > 5) {
            lastTextResizers.shift();
        }
    }

    function replaceSelectedText(newText: string, removeTextFieldIfEmpty = false) {
        (Transforms as any).removeEmptyNodes = true;
        const newSelection: TextSelection[] = [];
        const selectedTexts = useModelStore.getState().selectedTexts;
    
        for (const selectedText of selectedTexts) {
          // TODO: Support multiple selections
          newSelection.push({ ...selectedText, text: newText, isLoading: false });
        }
        useModelStore.getState().setSelectedTexts(newSelection, removeTextFieldIfEmpty);
        (Transforms as any).removeEmptyNodes = false;
    }

    const mouseEventToRotationMark = useCallback((e: React.MouseEvent) => {
        // Calculate the new rotation angle
        const rotationHandleRect = rotationHandle.current?.getBoundingClientRect();

        if (rotationHandle.current && rotationHandleRect) {
            const dx = e.clientX - ((rotationHandleRect.right-rotationHandleRect.width/2) - centerOffset);
            const dy = e.clientY - ((rotationHandleRect.bottom-rotationHandleRect.height/2) + centerOffset);

            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            // Convert to a rotation level
            const minAngle = Math.min(...rotationLevels);
            const maxAngle = Math.max(...rotationLevels);
            const level = Math.round((angle - minAngle) / (maxAngle - minAngle) * (rotationLevels.length - 1));
            setRotationMarkLevel(Math.min(level-2, 2));
            return angle;
        }

        return 0;
    }, [rotationHandle]);


    // Install global event listener for mouseup
    useEffect(() => {

        const keyDownListener = (e: KeyboardEvent) => {
            // If the element has a parent with the id "test"
            if (!document.activeElement?.contains(document.getElementById(elementId))) {
                return;
            }
            if (e.key === "Backspace" || e.key === "Delete") {
                replaceSelectedText("");
                e.preventDefault();
                e.stopPropagation();
            } else {
                const character = Utils.keyEventToCharacter(e);
                if (character) {
                    replaceSelectedText("");
                    // Send the Keyboard event to the text field to avoid losing the key press
                    const element = ReactEditor.toDOMNode(props.editor, props.editor);                
                    element.dispatchEvent(new KeyboardEvent('keydown', { key: e.key }));
                } else if ((e.ctrlKey || e.metaKey)) {
                    if (e.key === "x") {
                        // Cut
                        navigator.clipboard.writeText(textString);
                        replaceSelectedText("");
                    } else if (e.key === "c") {
                        // Copy
                        navigator.clipboard.writeText(textString);
                    } else if (e.key === "v") {
                        // Paste
                        navigator.clipboard.readText().then(clipText => {
                            replaceSelectedText(clipText);
                        });
                    }
                }
            }
        }

        const mouseUpListener = (e: MouseEvent) => {
            if (isRotating) {
                setIsRotating(false);
                if (textString.length > 0 && textString.split(" ").length > 1) {
                    textReorganizer.cachedExecute(rotationMarkLevel).then(result => {
                        useUndoModelStore.getState().storeUndoState();
                        animateNextChanges();
                        replaceSelectedText(result);
                        setIsLoading(false);
                    });
                    setIsLoading(true);
                }
            } else if (isResizing) {
                setIsResizing(false);
                if (resizingWidth !== 0) {
                    const spacePadding = TextUtils.getBestSpacePadding(textString, resizingWidth, childrenRef.current!, spacePaddingCharacter);
                    const newLength = textString.length + spacePadding;
                    const textResizerToUse = Math.abs(spacePadding) < 10 ? new TextResizer(textString) : textResizer;
                    textResizerToUse.cachedExecute(newLength).then(result => {
                        useUndoModelStore.getState().storeUndoState();
                        animateNextChanges();
                        setTemporaryText(result); // Useless in most cases except when the text remains the same
                        setResizingWidth(0);
                        replaceSelectedText(result);
                        setIsLoading(false);
                    });
                    setIsLoading(true);
                }
            }
        }

        const mouseMoveListener = (e: MouseEvent | React.MouseEvent) => {
            if (isResizing) {
                // Calculate the new width of the selection
                const seHandleRect = seHandleRef.current?.getBoundingClientRect();

                if (seHandleRef.current && seHandleRect) {
                    // Get the parent whose role is a textbox
                    let textBox = seHandleRef.current.parentElement?.closest("[role=textbox]") as HTMLElement;

                    if (textBox) {
                        const extraWidth = TextUtils.getAbsoluteWrappedLinesWidth(textBox, seHandleRect.left+seHandleRect.width/2, seHandleRect.top+seHandleRect.height/2, e.clientX, e.clientY);
                        let currentText = temporaryText.substring(0, Math.min(temporaryText.length + spacePadding, temporaryText.length));
                        currentText += spacePaddingCharacter.repeat(Math.max(spacePadding, 0));
                        const currentWidth = Utils.getTextMetrics(currentText, Utils.getCanvasFont(textBox)).width;

                        setResizingWidth(currentWidth+extraWidth);
                    }
                }
            } else if (isRotating) {
                mouseEventToRotationMark(e as any);
            }
        }

        window.addEventListener('mouseup', mouseUpListener);
        window.addEventListener('mousemove', mouseMoveListener);
        window.addEventListener('keydown', keyDownListener);
        return () => {
            window.removeEventListener('mouseup', mouseUpListener);
            window.removeEventListener('mousemove', mouseMoveListener);
            window.removeEventListener('keydown', keyDownListener);
        }
    }, [isResizing, isRotating, resizingWidth, rotationMarkLevel, textString]);

    let spacePadding = 0;
    if (resizingWidth > 0) {
        spacePadding = childrenRef.current ? TextUtils.getBestSpacePadding(temporaryText, resizingWidth, childrenRef.current!, spacePaddingCharacter) : 0;
    }

    const onMouseDown = (e: React.MouseEvent) => {
        setIsMouseDown(true);
        e.preventDefault();
        e.stopPropagation();
    }

    const onMouseUp = (e: React.MouseEvent) => {
        setIsMouseDown(false);
    }

    const onMouseMove = (e: React.MouseEvent) => {
        if (!disableDragging && isMouseDown && !dragging && e.buttons === 1 && !isResizing && !isRotating) {
            const rect = e.currentTarget.getBoundingClientRect();
            const rects = e.currentTarget.getClientRects();
            const newTextFieldId = "textField" + elementId;

            // Properly calculate the width of the selection by adding all the rectangles composing it (avoids the issue of the selection being split over multiple lines)
            let width = [...rects].reduce((acc, rect) => acc + rect.width, 0);
            let minHeight = Math.min(...[...rects].map(rect => rect.height));

            // To make the rectangle easier to use, we make sure its width is smaller than the width of the margin
            const pageWidth = 700 // Hard-coded, would be nice to properly retrieve it, but good enough for now
            const marginWidth = Math.min(Math.max(200, (document.body.clientWidth - pageWidth)/2), 700);
            width = Math.min(width, marginWidth);

            const newTextField : MoveableTextField = {
                x: rect.left,
                y: rect.top,
                width: width+30,
                height: minHeight,
                isMoveable: true,
                id: newTextFieldId,
                isVisible: true,
                //@ts-ignore
                state: [{ type: "paragraph", children: [{ text: textString }] }]
              }
              useModelStore.getState().setTextFields([...useModelStore.getState().textFields, newTextField]);

            const draggingParameters : DraggingParameters = {
                elementId: newTextFieldId,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
                cloned: false,
                initialX: e.clientX,
                initialY: e.clientY,
                initialStyle: {position: "absolute", opacity: "1", left: rect.left + "px", top: rect.top + "px", zIndex: "99"},
                onElementDropped(draggingParameters, element) {
                    // Update the position of the text field in the model
                    const rect = element?.getBoundingClientRect();
                    if (rect) {
                        useStudyStore.getState().logEvent("TEXTFIELD_CREATED", {text: textString, x: rect.left, y: rect.top, width: rect.width, height: rect.height});

                        useModelStore.getState().setTextField(newTextFieldId, {x: rect.left, y: rect.top, width: rect.width, height: rect.height});
                    }
                },
            };

            replaceSelectedText("");
            startDragging([draggingParameters])
            setIsDragged(true);
        }
    }
    
    const useLoadingClass = isLoading || selectedText?.isLoading;
    const handleSize = 7;
    const trimmedTemporaryText = temporaryText.substring(0, Math.min(temporaryText.length + spacePadding, temporaryText.length));

    const doNothing = (e : React.MouseEvent) => { 
        e.preventDefault();
        e.stopPropagation();
    };

    return <div id={elementId} style={{ position: 'relative', display: 'inline', cursor: 'pointer', opacity: isDragged ? '0.5' : '1' }} 
    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onClick={doNothing} onDoubleClick={doNothing} onMouseUp={onMouseUp} className={(useLoadingClass ? "loading " : "")+props.className}>


        {/* Place the rotation handles on the left*/}
        {!disableResizing && <span style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', zIndex: 9999, left: -3, top: -4, border: '1px solid hsl(214, 84%, 56%)', width: handleSize, height: handleSize, background: 'white', cursor: nwRotationCursor }} />
            <div ref={swHandleRef} style={{ position: 'absolute', zIndex: 9999, left: -3, bottom: -4, border: '1px solid hsl(214, 84%, 56%)', width: handleSize, height: handleSize, background: 'white', cursor: swRotationCursor }} />
        </span>}
        <span
            id={props.id}
            ref={props.ref}
            style={{ position: 'relative', background: props.leaf.selectionClassname === 'reviewIssue' ? 'rgba(255, 196, 0, 0.45)' : 'rgba(129, 189, 255, 0.5)', overflow: 'hidden', ...props.style }}
            title={props.leaf.selectionTooltip || undefined}
        >
            <span ref={childrenRef}><span>{trimmedTemporaryText}</span></span>
            <span style={{ color: 'transparent' }}>{spacePaddingCharacter.repeat(Math.max(spacePadding, 0))}</span>
        </span>
        {/* Place the resize and rotation handle at the end of the selection */}
        <span style={{ position: 'relative' }}>
            {!disableResizing && <div ref={rotationHandle} style={{ position: 'absolute', left: -4, top: -4, border: '1px solid hsl(214, 84%, 56%)', width: handleSize, height: handleSize, background: 'white', cursor: neRotationCursor }} onMouseDown={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                setIsRotating(true);
            }} />}
            { isRotating && <div style={{position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', cursor: neRotationCursor}}>
                <svg style={{overflow: 'visible'}}>
                    <path d={`M ${rotationMarkPositions[0].x} ${rotationMarkPositions[0].y} A 1 1 0 0 1 ${rotationMarkPositions[4].x} ${rotationMarkPositions[4].y}`} stroke="black" strokeWidth={3} fill="transparent"/>
                    {rotationMarkPositions.map((pos, i) => {
                        if (rotationMarkLevel+2 === i) {
                            return <circle key={i} cx={pos.x} cy={pos.y} r={6} strokeWidth={2} stroke={"black"} fill={rotationMarkLevel+2 === i ? "white" : "black"}/>
                        }
                        return <circle key={i} cx={pos.x} cy={pos.y} r={3} fill={"black"}/>
                    })}
                </svg>
            </div>}

            {!disableResizing && <div ref={seHandleRef} style={{ position: 'absolute', left: -4, bottom: -4, border: '1px solid hsl(214, 84%, 56%)', width: handleSize, height: handleSize, background: 'white', cursor: seRotationCursor }} />}

            {!disableResizing && <div style={{ position: 'absolute', left: -3, width: 6, height: '100%', top: 0, background: 'transparent', cursor: 'ew-resize' }} onMouseDown={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                setIsResizing(true);
            }} />}
        </span>
    </div>
}