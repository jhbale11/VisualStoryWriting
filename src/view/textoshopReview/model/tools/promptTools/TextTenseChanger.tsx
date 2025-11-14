import { useStudyStore } from "../../../model/StudyStub";
import { useModelStore } from "../../Model";
import { TextUtils } from "../../utils/TextUtils";
import { PromptTool } from "./PromptTool";

export type TextPOVChangerType = "FIRST_PERSON" | "THIRD_PERSON_LIMITED" | "THIRD_PERSON_OMNISCIENT";

export class TextPOVChanger extends PromptTool<{start: string, text: string, end: string}, TextPOVChangerType, string> {
    execute(type : TextPOVChangerType): Promise<string> {
        useStudyStore.getState().logEvent("PROMPT_TOOL_EXECUTED", { className: this.constructor.name, input: this.input , parameters: type});

        const label = "SELECTED_TEXT";
        let povDescription = "";
        let povInstructions = "";
        
        switch(type) {
            case "FIRST_PERSON":
                povDescription = "first-person point of view (1인칭 시점)";
                povInstructions = `Rewrite the selected text using FIRST-PERSON point of view:
- Use "I", "me", "my", "we", "us", "our" pronouns
- The narrator is a character in the story
- Show only what the narrator can see, hear, think, and feel
- Express the narrator's personal thoughts, feelings, and opinions directly
- Use phrases like "I thought", "I felt", "I saw", "I heard"
- The narrator cannot know what others are thinking unless told
- Maintain the narrator's subjective perspective throughout
- Keep the same plot, events, and other characters
- Adjust descriptions to reflect the narrator's personal perception and interpretation`;
                break;
            case "THIRD_PERSON_LIMITED":
                povDescription = "third-person limited point of view (3인칭 관찰자 시점)";
                povInstructions = `Rewrite the selected text using THIRD-PERSON LIMITED point of view:
- Use "he", "she", "they", "him", "her", "them" pronouns
- Follow ONE character closely (usually the main character)
- Show only what that ONE character can see, hear, think, and feel
- Express that character's thoughts and feelings, but not other characters'
- Use phrases like "he thought", "she felt", "they noticed"
- The narrator cannot know what happens when the focal character is not present
- Cannot reveal other characters' private thoughts or feelings directly
- Maintain focus on the focal character's perspective and experience
- Keep the same plot, events, and dialogue
- Describe events through the focal character's perception`;
                break;
            case "THIRD_PERSON_OMNISCIENT":
                povDescription = "third-person omniscient point of view (3인칭 전지적 작가 시점)";
                povInstructions = `Rewrite the selected text using THIRD-PERSON OMNISCIENT point of view:
- Use "he", "she", "they", "him", "her", "them" pronouns
- The narrator knows everything about all characters
- Can reveal any character's thoughts, feelings, and motivations
- Can show events happening in different places or times
- Can comment on the story, characters, or events from outside
- Use phrases like "he thought", "she felt", "unknown to them", "meanwhile", "little did they know"
- Can provide background information, context, or foreshadowing
- Can switch between different characters' perspectives freely
- May offer insights or commentary that no single character would have
- Keep the same plot, events, and dialogue
- Provide a comprehensive, all-knowing narrative perspective`;
                break;
        }

        let prompt = `You are a professional novel writing assistant specializing in narrative perspective (point of view) conversion.

CONTEXT (for reference):
Previous text: ${this.input.start.trim()}
${label}: ${this.input.text.trim()}
Following text: ${this.input.end.trim()}

TASK:
${povInstructions}

CRITICAL RULES:
1. Return ONLY the rewritten ${label} - do not include the previous or following text
2. Preserve the exact same events, plot points, and dialogue
3. Keep the same story content - only change the narrative perspective
4. Maintain the same scene, setting, and timeline
5. Ensure smooth flow with the context if pronouns or references need adjustment
6. Do not add new information or remove existing information
7. Do not add any explanations, comments, or labels
8. Keep similar length and pacing
9. Maintain the original tone and style as much as possible
10. Ensure grammatical correctness and natural flow in ${povDescription}

SELECTED_TEXT to rewrite:
${this.input.text.trim()}

Return only the rewritten text in ${povDescription}:`;

        return useModelStore.getState().executePrompt({ prompt: prompt }).then(result => {
            const newText = TextUtils.getFittingString(result.result, this.input.start + this.input.text + this.input.end);
            return newText;
        });
    }
}