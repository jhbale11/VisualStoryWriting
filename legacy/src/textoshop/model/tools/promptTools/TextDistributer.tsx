import { useStudyStore } from "../../../study/StudyModel";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export class TextDistributer extends PromptTool<string, void, string> {
    execute(): Promise<string> {
        const text = this.input;

        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input });



        let prompt = `${text}\n\n` + "Break this text into multiple sentences. One sentence per idea.";

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, text);
            return newText;
        });
    }
}