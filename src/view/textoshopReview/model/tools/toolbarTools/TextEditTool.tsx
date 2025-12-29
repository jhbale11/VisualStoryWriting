import { LuTextCursor } from "react-icons/lu";
import { ToolTextSelectionEvent, ToolbarTool } from "./ToolbarTool";
import { useModelStore } from "../../Model";

/**
 * Plain text editing mode: visual-only overlay so native selection/drag (and
 * extensions like Grammarly) keep working while still showing selection rects.
 */
export class TextEditTool extends ToolbarTool {
    constructor() {
        super(TextEditTool.getToolName());
    }

    static getToolName(): string {
        return "Edit";
    }

    getIcon(): React.ReactElement {
        return <LuTextCursor />;
    }

    isIconAsCursor(): boolean {
        return false; // Keep native text cursor for editing
    }

    selectionOverlayMode(): "full" | "visual-only" | "disabled" {
        return "visual-only"; // Show selection rectangles but keep native behavior
    }

    enableSelectionOverlay(): boolean {
        return true; // We still want to draw the rectangles (visual only)
    }

    onTextSelected(event: ToolTextSelectionEvent): void {
        // Do not create custom selections; also clear any previous tool leftovers.
        event.preventTextSelection = true;
        useModelStore.getState().setSelectedTexts([]);
    }
}

