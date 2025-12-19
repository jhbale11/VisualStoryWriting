// Static class with a bunch of utility functions for text manipulation

import * as Diff from 'diff';
import { BaseEditor, Descendant, Node } from "slate";
import { ReactEditor } from "slate-react";
import { temporaryTextFieldAnimation } from "../Model";


export class TextAnimationUtils {
    static getHighlightedNodeDifference(previousState : Node[], newState : Node[]) : Node[] {
        // We make sure to remove any child that is marked as removed
        const previousText = previousState.map((node : any) => Node.string({children: node.children.filter((c : any) => c.removed === undefined)})).join("\n");
        const newText = newState.map((node : any) => Node.string({children: node.children.filter((c : any) => c.removed === undefined)})).join("\n");
        
        if (previousText !== newText) {
            // Remove all the \0 in newText
            const zeroRegexp = new RegExp("\\0", 'g');
            const differences = Diff.diffWordsWithSpace(previousText, newText.replace(zeroRegexp, ""));
            // Construct the new state that highlights the differences
            const newState : Descendant[] = [];

            for (const difference of differences) {
                if (difference.removed) {
                    newState.push({ text: difference.value, removed: true } as any);
                } else if (difference.added) {
                    newState.push({ text: difference.value, added: true } as any);
                } else {
                    // No modification to this word, it stays the same
                    newState.push({ text: difference.value } as any);
                }
            }
            
            return [{children: newState, type: "paragraph", differences: true} as any];
        }

        return [];
    }

    static startTextFieldAnimation(textFieldId : string, editor : BaseEditor & ReactEditor, currentState : Node[], temporaryAnimationState : Node[], timeout = 1500) {
        // Make sure there is no state animation already started
        TextAnimationUtils.stopTextFieldAnimation(textFieldId, editor);

        // Store the selection, deselect and set the temporary animation state
        const storedSelection = JSON.parse(JSON.stringify(editor.selection));
        editor.deselect();
        editor.children = temporaryAnimationState;
        editor.onChange();

        // Now, we need to prepare to restore the previous state and selection after the animation ends
        const timeoutId = setTimeout(() => {
            TextAnimationUtils.stopTextFieldAnimation(textFieldId, editor);
        }, timeout);

        temporaryTextFieldAnimation[textFieldId] = {
            timeout: timeoutId,
            storedSelection: storedSelection,
            storedState: currentState,
        };
    }

    static stopTextFieldAnimation(textFieldId : string, editor : BaseEditor & ReactEditor) {
        const animation = temporaryTextFieldAnimation[textFieldId];
        if (animation) {
            clearTimeout(animation.timeout);
            editor.children = animation.storedState;
            // If the stored selection is set at the end of the text, this is probably a bug, so better to deselect completely
            //if (animation.storedSelection?.anchor?.offset || 0 > 0) {
            //    const lastTextNode = Node.last(editor, []);
            editor.deselect();
            //}
            //editor.selection = animation.storedSelection;
            editor.onChange();
            temporaryTextFieldAnimation[textFieldId] = null;
        }
    }

}