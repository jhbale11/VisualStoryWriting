import { FaEyeDropper } from "react-icons/fa6";
import { useStudyStore } from "../../../study/StudyModel";
import { useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { TextTonePicker } from "../promptTools/TextTonePicker";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";


export class TonePickerTool extends ToolbarTool {
    constructor() {
        super(TonePickerTool.getToolName());
    }

    getMarksClassname() : string {
        return "genericSelection";
    }

    getIcon() : React.ReactElement {
        return <FaEyeDropper />
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 2, y: 14 };
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const tone = useModelStore.getState().tone;
        const text = event.range.toString()

        if (text.length > 1) {
            new TextTonePicker(text).execute(tone).then(result => {
                useUndoModelStore.getState().storeUndoState();
                useStudyStore.getState().logEvent("TONE_CHANGED", {source: "eyedropper", tone: tone});
                useModelStore.getState().setTone(result);
                useModelStore.getState().setSelectedTexts([]);
            });
        }
    }

    static getToolName() : string {
        return "Tone Picker";
    }
}