import { useStudyStore } from "../../../model/StudyStub";
import { ToneLevel, useModelStore } from "../../Model";
import { PromptParserUtils } from "../../utils/PromptParserUtils";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export class TextToneChanger extends PromptTool<string, ToneLevel[], string> {
    initialTone: ToneLevel[];

    constructor(originalText: string, initialTone: ToneLevel[]) {
        super(originalText);
        this.initialTone = initialTone;
        this.cache.set(JSON.stringify(initialTone), originalText);
    }

    execute(newTone: ToneLevel[]): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: newTone });

        const text = this.input;

        let prompt = `${text}\n\nRewrite the sentence with the following tones:`;
        let isDifferent = false;

        for (const tone of newTone) {
            // Find the initial value if there is one
            const initialTone = this.initialTone.find(t => t.lowAdjective === tone.lowAdjective && t.highAdjective === tone.highAdjective);
            const initialValue = initialTone ? initialTone.value : 5;

            if (tone.value !== initialValue) {
                prompt += `\n- On a scale from 0 being ${tone.lowAdjective} and 10 being ${tone.highAdjective}, this is currently a ${initialValue} => change it to a ${tone.value} by making it more ${tone.value > 5 ? tone.highAdjective : tone.lowAdjective}\n`;
                isDifferent = true;
            }
        }

        if (!isDifferent) {
            // Seems like all the values are identical to the initial ones, we do not do anything
            return new Promise<string>((resolve, reject) => {
                resolve(text);
            });
        }

        return useModelStore.getState().executePrompt({ prompt: prompt + "\nRespond with a JSON object with the property 'sentence'", json: true }).then(result => {
            //const newText = TextUtils.getFittingString(result.result, text);
            try {
                const sentenceObject = PromptParserUtils.parseJSON(result.result);
                const newText = TextUtils.getFittingString(sentenceObject.sentence, text);
                return newText;
            } catch (e) {
                console.error("Error while parsing JSON", e);
            }
            return this.input;
        });
    }
}