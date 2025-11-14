import { FaPaintBrush } from "react-icons/fa";
import { TextSelection, useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { TextToneChanger } from "../promptTools/TextToneChanger";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";


export class DrawTool extends ToolbarTool {
    constructor() {
        super(DrawTool.getToolName());
    }

    getMarksClassname() : string {
        return "brush";
    }

    getIcon() : React.ReactElement {
        return <FaPaintBrush />
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 2, y: 14 };
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const tone = useModelStore.getState().tone;
        const text = event.range.toString()

        const startingTone =  [
            { lowAdjective: "Informal", highAdjective: "Formal", value: 5 },
            { lowAdjective: "Impolite", highAdjective: "Polite", value: 5 },
            { lowAdjective: "Complicated", highAdjective: "Simple", value: 5 },
        ];

        if (text.length > 1) {
            new TextToneChanger(text, startingTone).execute(tone).then(result => {
                const selectedTexts = useModelStore.getState().selectedTexts;
                const newSelection: TextSelection[] = [];
                for (const selectedText of selectedTexts) {
                    newSelection.push({ ...selectedText, text: result, isLoading: false });
                }
                useUndoModelStore.getState().storeUndoState();
                useModelStore.getState().animateNextChanges();
                useModelStore.getState().setSelectedTexts(newSelection);
                useModelStore.getState().setSelectedTexts([]);
            });
          }
    }

    static getToolName() : string {
        return "Tone Brush";
    }
}