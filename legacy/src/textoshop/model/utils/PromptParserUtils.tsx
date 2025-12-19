// Static class with a bunch of utility functions for text manipulation

import { jsonrepair } from "jsonrepair";

/** Utils to parse the results of prompts */

export class PromptParserUtils {
    static parseJSON(json : string) : any {
        // Prompt results tend to decorate the JSON using markdown. If we detect this decoration, we only keep what is inside the code block
        if (json.includes("```json") ) {
            const start = json.indexOf("```json") + 7;
            const end = json.indexOf("```", start);
            json = json.substring(start, end);
        }

        // Now, try parsing the JSON
        try {
            return JSON.parse(json);
        } catch (e) {
            // Seems like there are still issues, try to repair the json
            json = jsonrepair(json);
            try {
                return JSON.parse(json);
            } catch (e) {
                console.error("Error while parsing JSON", e);
            }
        }
        return null; // We could not parse the json
    }
}