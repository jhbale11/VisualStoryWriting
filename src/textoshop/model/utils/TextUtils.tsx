// Static class with a bunch of utility functions for text manipulation

import { BaseEditor, Descendant, createEditor } from "slate";
import { Utils } from "../../view/Utils";


const punctuationMarks = [".", ",", ";", ":", "!", "?", "(", ")", "[", "]", "{", "}", "<", ">", "\"", "'"];
const dummyEditor = createEditor();

export function editSlateState(state : Descendant[], callback : (editor: BaseEditor) => void) : Descendant[] {
    dummyEditor.children = state;
    callback(dummyEditor);
    return dummyEditor.children;
}

export class TextUtils {
    // Function to make a string beginning and end match another string so that it could "fit" wherever that other string was placed
    // The reason of this function is mostly because the LLM often adds an upper case and punctuation to every result, even if they are just text fragments. So this function mitigates that problem.
    static getFittingString(inputString: string, modelString: string) : string {
        // The result has to match with what appears before and after
        let result = inputString;

        if (result.length <= 1) {
            return result;
        }

        // Extract the spaces before and after the selected text
        const spacesBefore = modelString.match(/^\s*/);
        const spaceBeforeStr = spacesBefore ? spacesBefore[0] : "";
        const spacesAfter = modelString.match(/\s*$/);
        const spaceAfterStr = spacesAfter ? spacesAfter[0] : "";
        // Remove the spaces before and after the model string and input string
        modelString = modelString.trim();
        result = result.trim();

        const firstChar = modelString[0];
        const lastChar = modelString[modelString.length - 1];
        const firstCharResult = result[0];
        const lastCharResult = result[result.length - 1];

        // Make the first letter of the result match the case of the first letter of the selected text
        if (firstChar === firstChar.toUpperCase()) {
            result = result[0].toUpperCase() + result.substring(1);
        } else {
            result = result[0].toLowerCase() + result.substring(1);
        }

        // Use the punctuation from modelString instead of/in addition to result
        if (lastChar !== lastCharResult) {
            // If result finishes with some punctuation, remove it
            if (punctuationMarks.includes(lastCharResult)) {
                result = result.substring(0, result.length - 1);
            }

            // If the selected text finishes with some punctuation, add it to the result
            if (punctuationMarks.includes(lastChar)) {
                result = result + lastChar;
            }
        }

        // Do the same for the first character
        if (firstChar !== firstCharResult) {
            // If result starts with some punctuation, remove it
            if (punctuationMarks.includes(firstCharResult)) {
                result = result.substring(1);
            }

            // If the selected text starts with some punctuation, add it to the result
            if (punctuationMarks.includes(firstChar)) {
                result = firstChar + result;
            }
        }

        // Add the spaces before and after the selected text
        return spaceBeforeStr + result + spaceAfterStr;
    }


    /* Calculates how many times a string has to be repeated to reach a certain width (in pixel) when the string is displayed in a certain font size */
    static getBestSpacePadding(stringToPad: string, pixelWidth: number, htmlElement : HTMLElement, spacePaddingString = " ") : number {
        // Add or removing padding until get a size that is close to the new width (Binary search because this part is quite slow)
        let currentSpacePadding = 0;
        let min = -stringToPad.length;
        let max = pixelWidth;
        let bestSpacePadding = currentSpacePadding;
        let bestSpacePaddingDelta = 9999;
        while (min <= max) {
            currentSpacePadding = Math.ceil((min + max) / 2);

            // if current space padding is negative, we remove characters from the selectedText
            let text = currentSpacePadding > 0 ? stringToPad + spacePaddingString.repeat(currentSpacePadding) : stringToPad.substring(0, stringToPad.length + currentSpacePadding);

            const width = Utils.getTextMetrics(text, Utils.getCanvasFont(htmlElement)).width;
            const delta = Math.abs(width - pixelWidth);

            if (width === pixelWidth) {
                break;
            } else if (width < pixelWidth) {
                min = currentSpacePadding + 1;
            } else {
                max = currentSpacePadding - 1;
            }

            if (delta < bestSpacePaddingDelta) {
                bestSpacePaddingDelta = delta;
                bestSpacePadding = currentSpacePadding;
            }
        }

        return bestSpacePadding
    }

    /* 
        Calcualtes the absolute width of the text between two coordinates
        If the text is wrapped, all the width of the wrapped lines are cumulated
    */
    static getAbsoluteWrappedLinesWidth(textBox : Element, x : number, y : number, x2 : number, y2 : number) : number {
        let newWidth = x2 - x;
        if (textBox) {
            // If the selection is over multiple lines, we need to tweak the width to take into account all these lines
            const lineHeight = parseInt(window.getComputedStyle(textBox).lineHeight.replace('px', ''));
            const nLines = Math.floor((y2 - y) / lineHeight);

            // Calculate a full line width in the textbox
            const fullLineWidth = textBox ? textBox.clientWidth : 0;

            // Calculate the width on the first line
            const firstLineWidth = textBox.getBoundingClientRect().right - x;
            const lastLineWidth = (x2 - textBox.getBoundingClientRect().left)

            // Adjust the width taking into account the multiple lines
            newWidth = firstLineWidth + (nLines) * fullLineWidth + lastLineWidth;
        }

        return newWidth;
    }
}