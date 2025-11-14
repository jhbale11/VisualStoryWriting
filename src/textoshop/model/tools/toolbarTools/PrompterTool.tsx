import React from "react";
import { RiInputCursorMove } from "react-icons/ri";
import { TextSelection, useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { useViewModelStore } from "../../ViewModel";
import { TextPrompter } from "../promptTools/TextPrompter";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";


export class PrompterTool extends ToolbarTool {
    constructor() {
        super(PrompterTool.getToolName());
    }

    getMarksClassname() : string {
        return "textSelection" // Marks will use this class
    }

    getIcon() : React.ReactElement {
        return <RiInputCursorMove />
    }
    
    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const selectedText = event.range.toString();
        const precedingText = event.precedingRange.toString();
        const followingText = event.followingRange.toString();

        useViewModelStore.getState().setPromptBoxValidatedCallback((prompt: string) => {
            // Mark the seleciton as loading
            const selectedTexts = useModelStore.getState().selectedTexts;
            const newSelection: TextSelection[] = [];
            for (const selectedText of selectedTexts) {
                newSelection.push({ ...selectedText, isLoading: true });
            }
            useModelStore.getState().setSelectedTexts(newSelection);

            new TextPrompter(selectedText, precedingText, followingText).execute(prompt).then(result => {
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
        });
        useViewModelStore.getState().openPromptBox();
    }

    static getToolName() : string {
        return "Prompt";
    }


}