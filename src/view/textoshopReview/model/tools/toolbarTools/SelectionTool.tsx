import { ToolbarTool } from "./ToolbarTool";

export class SelectionTool extends ToolbarTool {
    constructor() {
        super(SelectionTool.getToolName());
    }

    getMarksClassname() : string {
        return "textSelection" // Marks will use this class
    }

    static getToolName() : string {
        return "Select";
    }

    isIconAsCursor() : boolean {
        return false;
    }
}