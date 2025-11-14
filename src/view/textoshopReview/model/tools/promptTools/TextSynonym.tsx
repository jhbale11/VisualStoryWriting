import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { PromptTool } from "./PromptTool";

export class TextSynonym extends PromptTool<string, { context: string }, string> {
    execute(params: { context: string }): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: params });

        const word = this.input;
        const context = params.context || "";

        const prompt = `Word: ${word}\nContext: ${context}\n\nTask: Replace the Word with a single, context-appropriate synonym that preserves the intended meaning and tone.\nRules: Return only the synonym (one or two words max), no explanations.`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const synonym = (result.result || "").trim();
            if (!synonym) return word;
            return synonym;
        })
    }
}



