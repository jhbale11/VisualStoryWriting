import React from "react";
import { FaItalic } from "react-icons/fa";
import { TextSelection, useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";

export class ItalicTool extends ToolbarTool {
    constructor() {
        super(ItalicTool.getToolName());
    }

    getIcon(): React.ReactElement {
        return <FaItalic />
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const selectedText = event.range.toString();
        if (!selectedText || selectedText.length === 0) return;

        const wrapped = `*${selectedText}*`;

        const selectedTexts = useModelStore.getState().selectedTexts;
        const newSelection: TextSelection[] = [];
        for (const st of selectedTexts) {
            newSelection.push({ ...st, text: wrapped, isLoading: false });
        }
        useUndoModelStore.getState().storeUndoState();
        useModelStore.getState().animateNextChanges();
        useModelStore.getState().setSelectedTexts(newSelection);
        useModelStore.getState().setSelectedTexts([]);
    }

    applyOnCurrentSelection?(): void {
        const selectedTexts = useModelStore.getState().selectedTexts;
        if (selectedTexts.length === 0) return;
        const newSelection: TextSelection[] = [];
        for (const st of selectedTexts) {
            const wrapped = `*${st.text}*`;
            newSelection.push({ ...st, text: wrapped, isLoading: false });
        }
        useUndoModelStore.getState().storeUndoState();
        useModelStore.getState().animateNextChanges();
        useModelStore.getState().setSelectedTexts(newSelection);
        useModelStore.getState().setSelectedTexts([]);
    }

    static getToolName(): string {
        return "Italicize";
    }
}


