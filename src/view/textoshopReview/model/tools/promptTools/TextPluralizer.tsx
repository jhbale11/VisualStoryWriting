import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export enum TextPluralizerType {
    SINGULARIZE,
    PLURALIZE
}

export class TextPluralizer extends PromptTool<{start: string, text: string, end: string}, TextPluralizerType, string> {
    execute(type : TextPluralizerType): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: type });

        const label = type === TextPluralizerType.SINGULARIZE ? "PART_TO_SINGULAR" : "PART_TO_PLURAL";
        let prompt = `${this.input.start.trim()} ${label} ${this.input.end.trim()}\n\n` + `${label}: ${this.input.text.trim()}\n\nRewrite this text by ${type === TextPluralizerType.PLURALIZE ? "pluralizing" : "singularizing"} ${label}.`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, this.input.start + this.input.text + this.input.end);
            return newText;
        });
    }
}