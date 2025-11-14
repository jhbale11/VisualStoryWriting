import React from "react";
import { MdOutlineTextRotateVertical, MdOutlineTextRotationNone } from "react-icons/md";
import { TextTenseChanger } from "../promptTools/TextTenseChanger";
import { LocalWithGlobalImpactTool } from "./LocalWithGlobalImpactTool";

export class PastTenseChangerTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(PastTenseChangerTool.getToolName());
    }

    getIcon() : React.ReactElement {
        // Flipped icon
        return <MdOutlineTextRotationNone style={{transform: "scaleX(-1)"}} />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "To Past Tense";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextTenseChanger({start: startText, text: text, end: endText}).execute("PAST");
    }
}

export class PresentTenseChangerTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(PresentTenseChangerTool.getToolName());
    }

    getIcon() : React.ReactElement {
        return <MdOutlineTextRotateVertical style={{transform: "scaleX(-1)"}} />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "To Present Tense";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextTenseChanger({start: startText, text: text, end: endText}).execute("PRESENT");
    }
}

export class FutureTenseChangerTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(FutureTenseChangerTool.getToolName());
    }

    getIcon() : React.ReactElement {
        return <MdOutlineTextRotationNone />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "To Future Tense";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextTenseChanger({start: startText, text: text, end: endText}).execute("FUTURE");
    }
}