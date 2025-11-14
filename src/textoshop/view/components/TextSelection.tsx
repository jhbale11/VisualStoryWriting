import React, { useEffect, useState } from "react";
import { Utils } from "../Utils";

export module RangeUtils {
    export function getRangeSnappedToWord(originalRange: Range) : Range {
        const range = originalRange.cloneRange();
        let spaceEaten = true;

        if (range.toString().length === 0) return originalRange;

        while (range.toString()[0].match(/[A-Za-zÀ-ÖØ-öø-ÿ]/)) {
            try {
                range.setStart(range.startContainer, range.startOffset - 1);   
            } catch (e) {
                spaceEaten = false;
                break;
            } 
        }
        if (spaceEaten && range.startOffset !== originalRange.startOffset) range.setStart(range.startContainer, range.startOffset + 1);

        spaceEaten = true;
        while (range.toString()[range.toString().length-1].match(/[A-Za-zÀ-ÖØ-öø-ÿ]/)) {
            try {
                range.setEnd(range.endContainer, range.endOffset + 1);   
            } catch (e) {
                spaceEaten = false;
                break;
            }  
        }
        if (spaceEaten && range.endOffset !== originalRange.endOffset) range.setEnd(range.endContainer, range.endOffset - 1);

        return range;
    }

    export function getRangeSnappedToSentence(originalRange: Range) : Range {
        const range = originalRange.cloneRange();
        let spaceEaten = true;
        let matchedParenthesis = false;

        if (range.toString().length === 0) return originalRange;

        while (range.toString()[0].match(/[^\.\(\n;\):]/)) {
            try {
                range.setStart(range.startContainer, range.startOffset - 1);   
            } catch (e) {
                spaceEaten = false;
                break;
            } 
        }
        if (range.toString()[0] === "(") matchedParenthesis = true;
        if (spaceEaten && range.startOffset !== originalRange.startOffset) range.setStart(range.startContainer, range.startOffset + 1);

        spaceEaten = true;
        while (range.toString()[range.toString().length-1].match(matchedParenthesis ? /[^\)]/ : /[^\.\n;:]/)) {
            try {
                range.setEnd(range.endContainer, range.endOffset + 1);   
            } catch (e) {
                spaceEaten = false;
                break;
            }  
        }
        if (spaceEaten && range.endOffset !== originalRange.endOffset) range.setEnd(range.endContainer, range.endOffset - 1);

        return range;
    }
}

enum SelectionOrigin {
    UNKNOWN,
    SHIFT_KEY,
    MOUSE
}

export default function TextSelection(props: {children: JSX.Element, onTextSelected?: (selectionRange: Range) => void, className : string, style : React.CSSProperties, opaque: boolean, disabled?: boolean}) {

    const [rectangles, setRectangles] = useState<{x: number, y: number, width: number, height: number, text: string}[]>([]);
    const parentDivRef = React.createRef<HTMLDivElement>();
    const [selectionOrigin, setSelectionOrigin] = useState<SelectionOrigin>(SelectionOrigin.UNKNOWN);

    const rangeFromPoints = (x1: number, y1: number, x2: number, y2: number) : Range => {
        const range1 = document.createRange();
        const range2 = document.createRange();
        const startCaretPosition = Utils.caretPositionFromPoint(x1, y1);
        const endCaretPosition = Utils.caretPositionFromPoint(x2, y2);

        if (startCaretPosition && endCaretPosition) {
            range1.setStart(startCaretPosition.offsetNode, startCaretPosition.offset);
            range1.setEnd(endCaretPosition.offsetNode, endCaretPosition.offset);

            // Also try to form a range by swapping the start and end caret positions (in case the selection is done from right to left)
            range2.setStart(endCaretPosition.offsetNode, endCaretPosition.offset);
            range2.setEnd(startCaretPosition.offsetNode, startCaretPosition.offset);
        }

        return range1.toString().length > range2.toString().length ? range1 : range2;
    }


    const updateSelectionRectangles = (range : Range) => {
        const parentDivBounds = parentDivRef.current?.getBoundingClientRect();

        if (parentDivBounds) {
            const rectangles = Array.from(range.getClientRects());
            setRectangles(rectangles.map((rect) => {
                const range = props.opaque ? rangeFromPoints(rect.left+2, rect.top+rect.height/2, rect.right-2, rect.top+rect.height/2) : null;
                return {
                    x: rect.x - parentDivBounds!.x,
                    y: rect.y - parentDivBounds!.y,
                    width: rect.width,
                    height: rect.height,
                    text: range ? range.toString() : ""
                };
            }));
        }
    };

    const onSelectionInProgress = () => {
        const selection = window.getSelection();

        if (!props.disabled && selection && selection.rangeCount > 0) {
            const range = RangeUtils.getRangeSnappedToWord(selection.getRangeAt(0));
            updateSelectionRectangles(range);
        }
    }

    const onSelectionCompleted = () => {
        const selection = window.getSelection();
        
        if (!props.disabled && selection && selection.rangeCount > 0) {
            const range = RangeUtils.getRangeSnappedToWord(selection.getRangeAt(0));
            selection.removeAllRanges();
            selection.addRange(range);

            setRectangles([]);
            if (props.onTextSelected) {
                props.onTextSelected(range);
            }
        }

        setSelectionOrigin(SelectionOrigin.UNKNOWN);
    }

    const onMouseUp = (e: MouseEvent) => {
        if (e.button === 0 && selectionOrigin === SelectionOrigin.MOUSE) {
            onSelectionCompleted();
        }
    }

    const onGlobalSelectionChange = (e: Event) => {
        if (selectionOrigin !== SelectionOrigin.UNKNOWN) {
            onSelectionInProgress();
        }
    }

    useEffect(() => {
        document.addEventListener('selectionchange', onGlobalSelectionChange);
        document.addEventListener('mouseup', onMouseUp)
        
        return () => {
            document.removeEventListener('selectionchange', onGlobalSelectionChange);
            document.removeEventListener('mouseup', onMouseUp);
        }
    });

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Shift" || e.key === "Control" || e.key === "Meta") {
            setSelectionOrigin(SelectionOrigin.SHIFT_KEY);
        }
    }

    const onKeyUp = (e: React.KeyboardEvent) => {
        if ((e.key === "Shift" || e.key === "Control" || e.key === "Meta") && selectionOrigin === SelectionOrigin.SHIFT_KEY) {
            onSelectionCompleted();
        }
    }

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            setSelectionOrigin(SelectionOrigin.MOUSE);
        }
    }

    return <div onKeyDown={onKeyDown} onKeyUp={onKeyUp} onMouseDown={onMouseDown} ref={parentDivRef} style={{position: 'relative'}}>
        {rectangles.map((rect, index) => {
            return <div className={props.className} key={index} style={{...props.style, position: 'absolute', left: rect.x, top: rect.y, width: rect.width+2, height: rect.height, pointerEvents: 'none', zIndex: props.opaque ? 9999 : undefined, display: 'flex', flexDirection: 'row', alignItems: 'center'}}>{props.opaque ? rect.text : ""}</div>
        })}
        {props.children}
    </div>;

}