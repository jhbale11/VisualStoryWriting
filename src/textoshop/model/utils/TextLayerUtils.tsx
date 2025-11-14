// Static class with a bunch of utility functions for text manipulation

import * as Diff from 'diff';
import { BaseEditor, Editor, Node, Transforms } from "slate";
import { HiearchicalLayer, HiearchicalLayers, TextLayer, TextLayers } from "../Model";
import { SlateUtils } from "./SlateUtils";
import { editSlateState } from "./TextUtils";


export class TextLayerUtils {
    /**
     * Normalize the state of the text field by keeping only one main element
     * @param state 
     */
    static normalizeState(state : Node[]) : Node[] {
        // States are typically separated in blocks. This is complexifying a lot of the code for little benefits, so we get rid of those blocks by manually adding newlines
        if (state.length > 1) {
            const mergedChildren : Node[] = [];
            state.forEach((block, idx) => {
                if ((block as any).children !== undefined) {
                    mergedChildren.push(...(block as any).children);
                } else {
                    mergedChildren.push(block);                
                }

                // Add a new line if this is not the last block
                if (idx < state.length - 1) {
                    mergedChildren.push({text: '\n'});
                }
            });
            const newState = [{type: 'paragraph', children: mergedChildren}] as any;
            return newState;
        }

        return state;
    }

    /**
     * Updates the layers based on the new state of the text field
     * This works by "reverse-engineering" the new state based on what we know about each layer. The goal is to figure out what are the new modifications and to what layers do they belong
     * @param layers 
     * @param selectedLayerId 
     * @param newState 
     * @returns 
     */
    static updateLayersFromNewState(hiearchicalLayers : HiearchicalLayers, selectedLayerId: number, newState : Node[]) : HiearchicalLayers | null {
        /* 
        Layers are anchored in the first text layer. When a layer other than the first one is modified, the corresponding position in the first layer is marked using an id such as "tag123".
        Then, the layer that was modified only stores the difference by mapping "tag123" to the new text added/removed/replaced.
        - To calculate the position of the corresponding marked text in the first layer, we simply calculate the difference between the first layer and the second layer (asssuming there is only two layers).
            TODO: For more than 2 layers, we progressively calculate the difference between the first and second layer (and add the corresponding tags), then the third, and so on until reaching the last layer.
        - To calculate the final text state, we simply reconstruct the text by iterating over the layers and progressively replacing each tag by the text indicated by a layer. This also supports hiding by skipping the layer
        TODO: - To calculate the modification when some in-between layers are invisible ???
         */

        // Flatten the layers to make them easier to access through their index
        const layers = TextLayerUtils.flattenHierarchicalLayersToTextLayer(hiearchicalLayers);

        

        // It should not be possible to edit an invisible layer
        if (!layers[selectedLayerId].isVisible) {
            return hiearchicalLayers;
        }


        if (selectedLayerId === 0) {
            /* 1) First layer is edited */
            if (layers.length === 1 || layers.slice(1).every(layer => Object.keys(layer.modifications).length === 0 || !layer.isVisible)) {
                /* 1.1) Simplest case: there are no other layer (or the other layers have no modifications / are not visible) */
                /*      => The new state matches what the first layer should be */

                layers[0].state = JSON.parse(JSON.stringify(newState)); // Deep clone
                return hiearchicalLayers;
            } else {
                /* 1.2) There are other layers with modifications */
                /*      => The new state will have the modifications of the other layers and thus cannot be directly used to update the first layer */
                // Calculate the state of the first layer by removing the modifications of the visible layers
                const recoveredFirstLayerState = TextLayerUtils.recoverFirstLayerFromState(newState, layers);
                layers[0].state = JSON.parse(JSON.stringify(recoveredFirstLayerState)); // Deep clone
                return hiearchicalLayers;
            }
        } else {
            /* 2) Another layer is edited */
            const recoveredFirstLayerState = TextLayerUtils.recoverFirstLayerFromState(newState, layers);
            const firstLayerState = layers[0].state;

            const firstLayerText = firstLayerState.map(e => Node.string(e)).join("\n")

            // Flatten the states to be easier to compare
            const firstLayerFlattened = firstLayerState.map((e : any) => [...e.children, {text: '\n'}]).flat().slice(0, -1)
            const recoveredFirstLayerFlattened = recoveredFirstLayerState.map((e : any) => [...e.children, {text: '\n'}]).flat().slice(0, -1)

            let differences = [];
            if (firstLayerFlattened.length === recoveredFirstLayerFlattened.length) {
                // Same exact number of blocks, we compare per blocks because it avoids creating weird merges between different blocks
                for (let i = 0; i < (firstLayerState as any)[0].children.length; i++) {
                    const firstLayerBlock = (firstLayerState as any)[0].children[i];
                    const recoveredFirstLayerBlock = (recoveredFirstLayerState as any)[0].children[i];
                    differences.push(...Diff.diffChars(Node.string(firstLayerBlock), Node.string(recoveredFirstLayerBlock)))
                }
            } else {
                // Different number of blocks, we compare by converting to text first and hope for the best
                const recoveredFirstLayerText = recoveredFirstLayerState.map(e => Node.string(e)).join("\n");
                differences.push(...Diff.diffChars(firstLayerText, recoveredFirstLayerText));
            }

            // It can quickly become a mess with all the differences. So if this is the case, we group changes by bigger blocks
            if (differences.length > 10) {
                const blockDifferences = [];
                let addedBlock = "";
                let removedBlock = "";

                let removingStartIdx = -1;
                let addingStartIdx = -1;

                let currentIdx = 0;

                let lastBlock = null;

                differences.forEach((diff, idx) => {
                    if (diff.removed) {
                        if (removingStartIdx === -1) removingStartIdx = currentIdx;
                        removedBlock += diff.value;
                    }

                    if (diff.added) {
                        if (addingStartIdx === -1) addingStartIdx = currentIdx;
                        addedBlock += diff.value;
                    }

                    if (!diff.added && !diff.removed) {
                        if (idx < differences.length - 1) {

                            if (diff.value.length > 10) {
                                // Changes are separated by more than 10 characters, we consider this as a new block
                                if (removingStartIdx !== -1) blockDifferences.push({removed: true, count: removedBlock.length, value: removedBlock});
                                if (addingStartIdx !== -1) blockDifferences.push({added: true, count: addedBlock.length, value: addedBlock});
                                blockDifferences.push(diff);
                                removingStartIdx = -1;
                                addingStartIdx = -1;
                                addedBlock = "";
                                removedBlock = "";
                            } else {
                                //if (removingStartIdx === -1) blockDifferences.push({count: diff.count, value: diff.value});
                                if (addingStartIdx !== -1) addedBlock += diff.value;
                                if (removingStartIdx !== -1) removedBlock += diff.value;
                            }
                        } else {
                            lastBlock = diff;
                        }
                    }
                });
                
                if (addingStartIdx !== -1) blockDifferences.push({added: true, count: addedBlock.length, value: addedBlock});
                if (removingStartIdx !== -1) blockDifferences.push({removed: true, count: removedBlock.length, value: removedBlock});
                if (lastBlock)  blockDifferences.push(lastBlock);

                differences = blockDifferences;
            }

            let tagCounter = TextLayerUtils.getUniqueTagId(hiearchicalLayers);
            
            /**
             * Check for modifications outside of the tags
             */
            if (differences.length >= 1 && layers[0].isVisible) {
                // Iterate over the differences in backward order to avoid messing up the indexes
                let positionInFirstLayer = firstLayerText.length;
                for (let i = differences.length - 1; i >= 0; i--) {
                    const difference = differences[i];

                    // Find the corresponding position of this difference in the first layer
                    if (difference.removed || difference.added) {
                        const endPoint = SlateUtils.toSlatePoint(layers[0].state, positionInFirstLayer);
                        let startPoint = endPoint;
                        if (difference.removed) {
                            startPoint = SlateUtils.toSlatePoint(layers[0].state, positionInFirstLayer - difference.value.length);
                        }


                        if (startPoint && endPoint) {
                            let tagId = tagCounter;
                            layers[0].state = editSlateState(layers[0].state, (editor : BaseEditor) => {
                                if (difference.added) {
                                    ++tagCounter;
                                    tagId = tagCounter;
                                    // Seems like Slate does not like inserting empty text nodes, so we need to insert a \0 character and then replace it
                                    Transforms.insertNodes(editor, { text: "\0", layerTagId: tagId } as any, { at: startPoint });
                                    // Set the text of this newly created node
                                    const nodes = Editor.nodes(editor, { mode: 'all', match: (n : any) => n.layerTagId === tagId, at: []});
                                } else {
                                    editor.select({ anchor: startPoint, focus: endPoint});
                                    // First, check if this node's neighbour is also a "delete" tag. If so, reuse its tagId so that it gets merged
                                    const parentNode = Node.parent(editor, startPoint.path)
                                    const childId = startPoint.path[startPoint.path.length - 1];
                                    const node = parentNode.children[childId];

                                    const isAtTheEnd = endPoint.offset === Node.string(node).length;
                                    const isAtTheStart = startPoint.offset === 1;
                                    let neighbourNode : any = null;
                                    if (isAtTheStart && childId >= 1) {
                                        neighbourNode = parentNode.children[childId - 1];
                                    } else if (isAtTheEnd && childId < parentNode.children.length - 1) {
                                        neighbourNode = parentNode.children[childId + 1];
                                    }
                                    if (neighbourNode && neighbourNode.layerTagId !== undefined && layers[selectedLayerId].modifications[neighbourNode.layerTagId] === "") {
                                        tagId = neighbourNode.layerTagId;
                                    } else {
                                        ++tagCounter;
                                        tagId = tagCounter;
                                    }
                                    Editor.addMark(editor, "layerTagId", tagId);
                                }
                            });
                            layers[selectedLayerId].modifications[tagId] = difference.added ? difference.value : ""; // Need to use \0 otherwise Slate get rid of the empty marks randomly
                        }
                        
                    }

                    if (!difference.added) {
                        positionInFirstLayer -= difference.value.length;
                    }
                }
            }

            /**
             * Update the modications inside the tags
             */
            const updatedTagValues = TextLayerUtils.getTagValuesFromState(newState);
            // Retrieve all the tagIds from the preceding layers
            // Not including layers AFTER the selected layer makes them uneditable (we shouldnt be able to modify a layer that is higher up)
            // TODO: Still save the change if this happens? 
            const layerIdFromTagId = TextLayerUtils.getTagIdsFromLayers(layers, selectedLayerId-1, true); 

            for (const [tagId, modification] of Object.entries(updatedTagValues)) {
                if (tagId in layers[selectedLayerId].modifications) {
                    /* Simplest case: the tag modified belongs to the selected layer */
                    layers[selectedLayerId].modifications[tagId] = modification;
                } else {
                    /* The tag modified belongs to another layer */
                    const layerIdWithThisTag = layerIdFromTagId[tagId];
                    if (layerIdWithThisTag !== undefined) {
                        // Get the value of the tag in that layer
                        const originalTagValue = layers[layerIdWithThisTag].modifications[tagId];
                        if (originalTagValue !== modification) {
                            // Calculate the difference between the original and the new value
                            const differences = Diff.diffChars(originalTagValue, modification,);
                            // Create the corresponding new nodes in the first layer and update the modifications accordingly
                            const newNodes : any[] = [];
                            for (const diff of differences) {
                                if (diff.added) {
                                    newNodes.push({ text: "\0", layerTagId: ++tagCounter });
                                    layers[selectedLayerId].modifications[tagCounter] = diff.value;
                                } else if (diff.removed) {
                                    newNodes.push({ text: "\0", layerTagId: ++tagCounter});
                                    layers[layerIdWithThisTag].modifications[tagCounter] = diff.value;
                                    layers[selectedLayerId].modifications[tagCounter] = "";
                                } else {
                                    newNodes.push({ text: "\0", layerTagId: ++tagCounter});
                                    layers[layerIdWithThisTag].modifications[tagCounter] = diff.value;
                                }
                            }

                            layers[0].state = editSlateState(layers[0].state, (editor : BaseEditor) => {
                                const previousNode = Editor.nodes(editor, { mode: 'all', match: (n : any) => n.layerTagId+"" === tagId, at: []});
                                for (const [node, path] of previousNode) {
                                    Transforms.insertNodes(editor, newNodes, { at: path });
                                    break;
                                }
                                delete layers[layerIdWithThisTag].modifications[tagId];
                                Transforms.removeNodes(editor, { match: (n : any) => n.layerTagId+"" === tagId, at: []});
                            });
                        }
                    }
                }
            }

            return hiearchicalLayers;
        }

        return null;
    }

    /**
     * Calculate the state of the text field considering the text layers
     * @param layers 
     * @returns 
     */
    static getStateFromLayers(hiearchicalLayers : HiearchicalLayers) : Node[] {
        const layers = TextLayerUtils.flattenHierarchicalLayersToTextLayer(hiearchicalLayers);
        let state : Node[] = JSON.parse(JSON.stringify(layers[0].state)); // Start from the first layer
        const layersCount = layers.length;

        // Special case when the first layer is hidden
        // Then we get rid of all the blocks that do not have a tag
        if (!layers[0].isVisible) {
            state = state.map((block : any) => {
                block.children = block.children.filter((child : any) => child.layerTagId !== undefined);
                // If there are no children left, we add an empty text field to avoid crashes
                if (block.children.length === 0) {
                    block.children.push({ text: "" });
                }
                return block;
            });
        
        }

        for (let i = 1; i < layersCount; i++) {
            const layer = layers[i];
            if (layer.isVisible) {
                const layerModifications = layer.modifications;

                // Replace the tags by the modifications
                for (const [tagId, modification] of Object.entries(layerModifications)) {
                    // Find the corresponding tag in the state
                    for (const paragraph of state) {
                        for (const child of (paragraph as any).children) {
                            if ((child as any).layerTagId === parseInt(tagId)) {
                                child.text = modification;
                            }
                        }
                    }
                }
            }
        }

        return state;
    }

    /**
     * Retrieve the text used in each of the tags present in the state
     * @param state 
     * @returns 
     */
    static getTagValuesFromState(state : Node[]) : {[key: number]: string} {
        const tags : {[key: number]: string} = {};
        state.forEach((block : any) => {
            block.children.forEach((child : any) => {
                if (child.layerTagId !== undefined) {
                    tags[child.layerTagId] = child.text;
                }
            });
        });

        return tags;
    }

    /**
     * Retrieve the tagIds and their corresponding layer index
     * @param layers 
     * @returns 
     */
    static getTagIdsFromLayers(layers : TextLayers, untilLayerId : number = layers.length-1, excludeInvisibleLayers = false) : {[tagId: string]: number} {
        const tagIds : {[tagId: string]: number} = {};

        for (let i = 1; i <= untilLayerId; i++) {
            const layer = layers[i];
            if (!excludeInvisibleLayers || layer.isVisible) {
                for (const tagId of Object.keys(layer.modifications)) {
                    tagIds[tagId] = i;
                }
            }
        }

        return tagIds;
    }

    static recoverFirstLayerFromState(state : Node[], layers : TextLayers) : Node[] {
        // Get the value of all the tags in the first layer
        const tagsFirstLayerValue = TextLayerUtils.getTagValuesFromState(layers[0].state);

        // Replace the tags in the state by their value in the first layer
        const newState = JSON.parse(JSON.stringify(state));
        newState.forEach((block : any) => {
            block.children.forEach((child : any) => {
                if (child.layerTagId !== undefined && tagsFirstLayerValue[child.layerTagId] !== undefined) {
                    child.text = tagsFirstLayerValue[child.layerTagId];
                }
            });
        });


        return newState;
    }

    static forEachLayer(hiearchicalLayers : HiearchicalLayer[], callback : (layer: TextLayer, index: number) => void, startIndex : number = 0) {
        hiearchicalLayers.forEach((layer, index) => {
            callback(layer.layer, startIndex + index);
            if (layer.children) {
                TextLayerUtils.forEachLayer(layer.children, callback, startIndex + index + 1);
            }
        });
    }

    
    /**
     * Helper function to flatten a hierarchical layer structure
     * @param hiearchicalLayers 
     * @returns 
     */
    static flattenHierarchicalLayersToTextLayer(hiearchicalLayers : HiearchicalLayers) : TextLayers {
        const flattenLayers : TextLayer[] = [];
        const flatten = (layer: HiearchicalLayer) => {
            flattenLayers.push(layer.layer);
            if (layer.children) {
                layer.children.forEach(e => flatten(e));
            }
        }
        hiearchicalLayers.forEach(e => flatten(e));
        return flattenLayers as TextLayers;
    }


    /**
     * Helper function to flatten a hierarchical layer structure
     * @param hiearchicalLayers 
     * @returns 
     */
        static flattenHierarchicalLayers(hiearchicalLayers : HiearchicalLayers) : HiearchicalLayers {
            const flattenLayers : HiearchicalLayer[] = [];
            const flatten = (layer: HiearchicalLayer) => {
                flattenLayers.push(layer);
                if (layer.children) {
                    layer.children.forEach(e => flatten(e));
                }
            }
            hiearchicalLayers.forEach(e => flatten(e));
            return flattenLayers as HiearchicalLayers;
        }

    static flattenHierarchicalLayersWithParent(hiearchicalLayers : HiearchicalLayers) {
        // First, figure out the parent of the layer and its index within the parent
        type LayerWithParent = {parent: LayerWithParent | null, indexWithinParent: number, hlayer: HiearchicalLayer};
        const flattenLayers : LayerWithParent[] = [];

        const flatten = (parent : LayerWithParent | null, indexWithinParent : number, layer: HiearchicalLayer) => {
            const layerInfo = { parent: parent, indexWithinParent: indexWithinParent, hlayer: layer };
            flattenLayers.push(layerInfo);  
            if (layer.children) {
                layer.children.forEach((e, idx) => flatten(layerInfo, idx, e));
            }
        }
        hiearchicalLayers.forEach((e, idx) => flatten(null, idx, e));

        return flattenLayers;
    }

    static getUniqueTagId(hiearchicalLayers : HiearchicalLayers) : number {
        const layers = TextLayerUtils.flattenHierarchicalLayersToTextLayer(hiearchicalLayers);
        let maxTagId = 0;
        for (const layer of layers) {
            for (const tagId of Object.keys(layer.modifications)) {
                maxTagId = Math.max(maxTagId, parseInt(tagId));
            }
        }

        return maxTagId + 1;
    }

}