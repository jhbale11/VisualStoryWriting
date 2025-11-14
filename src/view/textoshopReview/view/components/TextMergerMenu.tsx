import { Button, ButtonGroup, Divider, Tooltip } from "@nextui-org/react";
import { PiExcludeSquareFill, PiIntersectSquareFill, PiSubtractSquareFill, PiUniteSquareFill } from "react-icons/pi";
import { TiArrowDownThick } from "react-icons/ti";
import { Editor, Node, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { DOMPoint } from "slate-react/dist/utils/dom";
import { TextSelection, textFieldEditors, useModelStore } from "../../model/Model";
import { TextMerger, TextMergingOperation } from "../../model/tools/promptTools/TextMerger";
import { useUndoModelStore } from "../../model/UndoModel";
import { useViewModelStore } from "../../model/ViewModel";
import { useStudyStore } from "../../model/StudyStub";

export function TextMergerMenu(props : {draggedElementId : string}) {
  const hoveredSentence = useViewModelStore(state => state.sentenceHovered);

  const mergeTextFragments = (operation : TextMergingOperation) => {
    // Get the text from the dragged element
    const draggedEditor = textFieldEditors[props.draggedElementId];
    if (!draggedEditor) return;

    const draggedText = Node.string(draggedEditor);

    // Get the text from the hovered sentence
    const hoveredSentence = useViewModelStore.getState().sentenceHovered;
    if (!hoveredSentence) return;

    const hoveredEditor = textFieldEditors[hoveredSentence.textfieldId];
    if (!hoveredEditor) return;

    // Store the state before we do anything
    useUndoModelStore.getState().storeUndoState();

    // Clean up by removing the dragged element and the sentence hovered
    useViewModelStore.getState().setSentenceHovered(null);
    useModelStore.getState().removeTextField(props.draggedElementId);    


    if (operation === TextMergingOperation.Insert) {
      if (hoveredSentence.caretPosition) {
        const domPoint : DOMPoint = [hoveredSentence.caretPosition.offsetNode, hoveredSentence.caretPosition.offset];
        const slatePosition = ReactEditor.toSlatePoint(hoveredEditor, domPoint, {exactMatch: true, suppressThrow: true});
  
        if (slatePosition) {
          useStudyStore.getState().logEvent("MERGE_TEXT_FRAGMENTS", { operation: operation, draggedText: draggedText });
          Transforms.insertText(hoveredEditor, draggedText, {at: slatePosition});
        }
      }
    } else {
      const hoveredText = Editor.string(hoveredEditor, hoveredSentence.slateRange);
      useStudyStore.getState().logEvent("MERGE_TEXT_FRAGMENTS", { operation: operation, draggedText: draggedText, hoveredText: hoveredText });


      // Select the text and mark it as loading
      hoveredEditor.select(hoveredSentence.slateRange);
      hoveredEditor.addMark("selection", true);
      hoveredEditor.addMark("selectionId", useModelStore.getState().selectedTexts.length);
      hoveredEditor.addMark("selectionClassname", "other");
      hoveredEditor.deselect();

      new TextMerger({triggerText: draggedText, receiverText: hoveredText}).execute(operation).then(result => {
        const selectedTexts = useModelStore.getState().selectedTexts;
        const newSelection: TextSelection[] = [];
        for (const selectedText of selectedTexts) {
            newSelection.push({ ...selectedText, text: result, isLoading: false });
        }
        useModelStore.getState().animateNextChanges();
        useModelStore.getState().setSelectedTexts(newSelection);
        useModelStore.getState().setSelectedTexts([]);
      });
    }
  }


  return (
  <div style={{display: 'flex', flexDirection: 'row', height: '100%'}}>
  { hoveredSentence?.cursorRange && <><Tooltip content="Insert" placement="top" delay={0} closeDelay={0}>
    <Button onClick={() => mergeTextFragments(TextMergingOperation.Insert)}  isIconOnly variant="light"><TiArrowDownThick /></Button>
  </Tooltip>
  <Divider style={{height: 40}} orientation="vertical" /></> }
  <ButtonGroup>
    <Tooltip content="Unite" placement="top" delay={0} closeDelay={0}>
      <Button variant='light' onClick={() => mergeTextFragments(TextMergingOperation.Unite)} isIconOnly ><PiUniteSquareFill /></Button>
    </Tooltip>
    <Tooltip content="Intersect" placement="top" delay={0} closeDelay={0}>
      <Button variant='light' onClick={() => mergeTextFragments(TextMergingOperation.Intersect)} isIconOnly><PiIntersectSquareFill /></Button>
    </Tooltip>
    <Tooltip content="Subtract" placement="top" delay={0} closeDelay={0}>
      <Button variant='light' onClick={() => mergeTextFragments(TextMergingOperation.Subtract)} isIconOnly><PiSubtractSquareFill /></Button>
    </Tooltip>
    <Tooltip content="Exclude" placement="top" delay={0} closeDelay={0}>
      <Button variant='light' onClick={() => mergeTextFragments(TextMergingOperation.Exclude)} isIconOnly><PiExcludeSquareFill /></Button>
    </Tooltip>
  </ButtonGroup>
  </div>
  )
}
