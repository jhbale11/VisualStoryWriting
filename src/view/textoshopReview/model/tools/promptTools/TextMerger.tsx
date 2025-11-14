import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export enum TextMergingOperation {
    Insert,
    Unite,
    Intersect,
    Subtract,
    Exclude
}

export class TextMerger extends PromptTool<{triggerText: string, receiverText: string}, TextMergingOperation, string> {
    execute(operation : TextMergingOperation): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: operation });


        const {triggerText, receiverText} = this.input;

        let operationPrompt = "";
        switch (operation) {
            case TextMergingOperation.Unite:
                operationPrompt = `Write the sentence resulting from merging A and B.`;
                break;
            case TextMergingOperation.Intersect:
                operationPrompt = `Write a sentence using ONLY the elements that appear in both A and B.`;
                break;
            case TextMergingOperation.Subtract:
                operationPrompt = `Write the sentence resulting from subtracting A from B. The idea expressed from A should be removed. Feel free to update the rest of the text so that it still make sense.`;
                break;
            case TextMergingOperation.Exclude:
                operationPrompt = `Write the sentence resulting from excluding A from B.`;
                break;
        }

        let prompt = `A: ${triggerText}\nB: ${receiverText}\n\n${operationPrompt}`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, receiverText);
            return newText;
        });
    }
}