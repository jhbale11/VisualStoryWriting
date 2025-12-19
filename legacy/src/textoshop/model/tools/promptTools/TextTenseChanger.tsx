import { useStudyStore } from "../../../study/StudyModel";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export type TextTenseChangerType = "PAST" | "PRESENT" | "FUTURE";

export class TextTenseChanger extends PromptTool<{start: string, text: string, end: string}, TextTenseChangerType, string> {
    execute(type : TextTenseChangerType): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input , parameters: type});

        const tense = type.toString().toLowerCase();
        const label = "PART_TO_" + tense.toUpperCase();
        let prompt = `${this.input.start.trim()} ${label} ${this.input.end.trim()}\n\n` + `${label}: ${this.input.text.trim()}\n\nRewrite this text by changing ${label} to the ${tense} tense. Return only the rewritten ${label} without any extra commentary.`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, this.input.start + this.input.text + this.input.end);
            return newText;
        });
    }
}