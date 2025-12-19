import { useStudyStore } from "../../../study/StudyModel";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export class TextRepair extends PromptTool<string, void, string> {
    execute(): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input });

        const text = this.input;

        let prompt = `Correct only grammatical errors in the text below. `;
        prompt += `Preserve ALL formatting (**, *, punctuation, line breaks). `;
        prompt += `Do NOT rephrase or change punctuation. `;
        prompt += `Return only the corrected text.\n\n`;
        prompt += `${text}`;
        
        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, text);
            return newText;
        });
    }
}