import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export class TextSmudger extends PromptTool<string, void, string> {
    execute(): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input });

        const text = this.input;


        let prompt = `${text}\n\n` + "Rewrite for clarity and flow. Return only the rewritten text, with no commentary.";

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, text);
            return newText;
        });
    }
}