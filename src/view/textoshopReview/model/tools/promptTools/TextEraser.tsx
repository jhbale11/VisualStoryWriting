import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export class TextEraser extends PromptTool<{start: string, text: string, end: string}, void, string> {
    execute(): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input });


        let prompt = `${this.input.start} ${this.input.end}\n\n` + "Fix this sentence without adding new words. You can reorganize the words and the sentence, but you can't add new words.";

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, this.input.start + this.input.text + this.input.end);
            return newText;
        });
    }
}