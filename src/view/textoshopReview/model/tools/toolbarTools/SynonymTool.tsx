import React from "react";
import { MdAutoFixHigh } from "react-icons/md";
import { TextSelection, useModelStore } from "../../Model";
import { useUndoModelStore } from "../../UndoModel";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";
import { TextSynonym } from "../promptTools/TextSynonym";

export class SynonymTool extends ToolbarTool {
    constructor() {
        super(SynonymTool.getToolName());
    }

    getIcon(): React.ReactElement {
        return <MdAutoFixHigh />
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        const selectedText = event.range.toString();
        const preceding = event.precedingRange.toString();
        const following = event.followingRange.toString();
        if (!selectedText || selectedText.length === 0) return;

        // Build short context around selection
        const context = `${preceding.slice(-100)} [${selectedText}] ${following.slice(0, 100)}`;

        // Mark selection loading
        const selectedTexts = useModelStore.getState().selectedTexts;
        useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, isLoading: true })));

        new TextSynonym(selectedText).execute({ context }).then(syn => {
            const current = useModelStore.getState().selectedTexts;
            const newSelection: TextSelection[] = [];
            for (const st of current) {
                newSelection.push({ ...st, text: syn, isLoading: false });
            }
            useUndoModelStore.getState().storeUndoState();
            useModelStore.getState().animateNextChanges();
            useModelStore.getState().setSelectedTexts(newSelection);
            useModelStore.getState().setSelectedTexts([]);
        });
    }

    static getToolName(): string {
        return "Change Synonym";
    }
}



