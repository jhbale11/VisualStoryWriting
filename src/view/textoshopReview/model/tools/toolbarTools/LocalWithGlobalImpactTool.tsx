import { Editor, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { RangeUtils } from "../../../view/components/TextSelection";
import { useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";

export class LocalWithGlobalImpactTool extends ToolbarTool {
    constructor(name: string) {
        super(name);
    }

    getMarksClassname() : string {
        return "genericSelection" // Marks will use this class
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return Promise.resolve("");
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const text = event.range.toString()
        const sentenceRange = RangeUtils.getRangeSnappedToSentence(event.range);

        const sentenceSlateRange = ReactEditor.toSlateRange(event.editor, sentenceRange, { exactMatch: true, suppressThrow: true});

        if (text.length > 1 && sentenceSlateRange) {
            const startRange = { anchor: sentenceSlateRange.anchor, focus: event.slateRange.anchor };
            const endRange = { anchor: event.slateRange.focus, focus: sentenceSlateRange.focus };

            const startText = Editor.string(event.editor, startRange);
            const endText = Editor.string(event.editor, endRange);

            if (text.length > 1) {
                this.executeLocalWithGlobalImpactModification(startText, text, endText).then(result => {
                    useUndoModelStore.getState().storeUndoState();
                    useModelStore.getState().setSelectedTexts([]);
                    useModelStore.getState().animateNextChanges();
                    Transforms.insertText(event.editor, result, { at: sentenceSlateRange });
                });
              }
        }
    }
}