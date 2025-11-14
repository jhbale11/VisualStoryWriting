import React from "react";
import { BsPerson, BsPeople, BsEye } from "react-icons/bs";
import { TextPOVChanger } from "../promptTools/TextTenseChanger";
import { LocalWithGlobalImpactTool } from "./LocalWithGlobalImpactTool";

export class FirstPersonPOVTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(FirstPersonPOVTool.getToolName());
    }

    getIcon() : React.ReactElement {
        return <BsPerson />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "1st Person POV";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextPOVChanger({start: startText, text: text, end: endText}).execute("FIRST_PERSON");
    }
}

export class ThirdPersonLimitedPOVTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(ThirdPersonLimitedPOVTool.getToolName());
    }

    getIcon() : React.ReactElement {
        return <BsEye />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "3rd Person Limited POV";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextPOVChanger({start: startText, text: text, end: endText}).execute("THIRD_PERSON_LIMITED");
    }
}

export class ThirdPersonOmniscientPOVTool extends LocalWithGlobalImpactTool {
    constructor() {
        super(ThirdPersonOmniscientPOVTool.getToolName());
    }

    getIcon() : React.ReactElement {
        return <BsPeople />;
    }

    getIconHotspot(): { x: number; y: number; } {
        return { x: 8, y: 8 };
    }

    static getToolName() : string {
        return "3rd Person Omniscient POV";
    }

    executeLocalWithGlobalImpactModification(startText: string, text: string, endText: string): Promise<string> {
        return new TextPOVChanger({start: startText, text: text, end: endText}).execute("THIRD_PERSON_OMNISCIENT");
    }
}