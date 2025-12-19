import { useStudyStore } from "../../../study/StudyModel";
import { ToneLevel, useModelStore } from "../../Model";
import { PromptParserUtils } from "../../utils/PromptParserUtils";
import { PromptTool } from "./PromptTool";

export class TextTonePicker extends PromptTool<string, ToneLevel[], ToneLevel[]> {

    execute(currentTone: ToneLevel[]): Promise<ToneLevel[]> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: currentTone });

        const text = this.input;

        let prompt = `$Analyze the following web novel dialogue: ${text}\n\n Rate the dialogue on ${currentTone.length} scales. Respond using JSON like`;

        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        prompt += "{" + currentTone.map((tone, index) => {
            return `${letters[index]}: /* rating on scale from 0 being ${tone.lowAdjective} to 10 being ${tone.highAdjective}*/`;
        }).join(",\n")+"}";

        return useModelStore.getState().executePrompt({ prompt: prompt, json: true }).then(result => {
            try {
                const pickedTone = PromptParserUtils.parseJSON(result.result);
                const newTone = JSON.parse(JSON.stringify(currentTone));
                Object.entries(pickedTone).forEach(([key, value]) => {
                    const index = letters.indexOf(key);
                    if (index !== -1) {
                        newTone[index].value = value;
                    }
                });
                return newTone;
            } catch (e) {
                console.error("Error while parsing JSON", e);
            }

            return currentTone;
        });
    }
}