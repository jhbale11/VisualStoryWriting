import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

const COUNT = 4;

export class TextReorganizer extends PromptTool<string, number, string> {
    constructor(originalText: string) {
        super(originalText);
        this.cache.set("0", originalText);
    }

    /**
     * Parse a string with a list of items separated by new lines and starting with 1. then 2., then 3., etc.
     * @param list 
     * @returns 
     */
    parseList(list: string): string[] {
        const lines = list.split("\n");
        const items = lines.map(line => {
            const match = line.match(/^\d+\.\s*(.*)/);
            if (match) {
                return match[1];
            }
            return null;
        }).filter(item => item !== null) as string[];
        return items;
    }

    execute(intensity : number): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input, parameters: intensity });


        const text = this.input;

        let prompt = `${text}\n\nReorganize the words in ${COUNT} different ways.`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            // Add the list to the cache
            const items = this.parseList(result.result);
            // TODO: Sort the list based on how intense the reorganization is
            const ids = [-2, -1, 1, 2]
            items.forEach((item, idx) => {
                this.cache.set(ids[idx]+"", TextUtils.getFittingString(item, text));
            });

            if (this.cache.has(intensity+"")) {
                return this.cache.get(intensity+"")!;
            } 

            // Return the closest intensity
            const cachedIntensities = [...this.cache.keys()].map(key => parseInt(key));
            let closestIntensity = cachedIntensities[0];
            for (let i = 1; i < cachedIntensities.length; i++) {
                if (Math.abs(cachedIntensities[i] - intensity) < Math.abs(closestIntensity - intensity)) {
                    closestIntensity = cachedIntensities[i];
                }
            }
            return this.cache.get(closestIntensity+"")!;
        });
    }
}