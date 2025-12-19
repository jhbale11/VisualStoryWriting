import React from "react";
import { MdHealing } from "react-icons/md";
import { TextSelection, useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { TextRepair } from "../promptTools/TextRepair";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";

export class RepairTool extends ToolbarTool {
    constructor() {
        super(RepairTool.getToolName());
    }

    getMarksClassname() : string {
        return "genericSelection" // Marks will use this class
    }

    getIcon() : React.ReactElement {
        return <MdHealing />
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const text = event.range.toString()

        if (text.length > 1) {
            new TextRepair(text).execute().then(result => {
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
        return "Repair / Fix Grammar";
    }


}