import { z } from "zod";
import { LayoutUtils } from "../../LayoutUtils";
import { EntityNode, useModelStore } from "../../Model";
import { JSONPrompt } from "../utils/JSONPrompt";

function CreateEntityNode(entity: { name: string; emoji: string; properties: Array<{ name: string; value: number }> }, index: number): EntityNode {
  return {
    id: `entity-${entity.name}`,
    type: 'entityNode',
    dragHandle: '.custom-drag-handle',
    measured: { width: 160, height: 160 },
    position: { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 },
    data: {
      name: entity.name,
      emoji: entity.emoji,
      properties: entity.properties || []
    }
  };
}

const ENTITY_SCHEMA = z.object({
    entities: z.array(z.object({
        name: z.string(),
        emoji: z.string(),
        properties: z.array(z.object({
            name: z.string(),
            value: z.number()
        }))
    }))
});


export function extractedEntitiesToNodeEntities(extractedData: z.infer<typeof ENTITY_SCHEMA>) : EntityNode[] {
    return extractedData.entities.map((entity, index) => CreateEntityNode(entity, index)); 
}


export function EntitiesExtractor(text : string, center: {x: number, y: number}) : Promise<EntityNode[]> {
    const prompt = text + 
    `\n\nExtract all the entities in this story.` +
    `For each entity, extract its 'name', an emoji best visually describing the entity (e.g., use the emoji of a person if it is a person but avoid reusing the same emojis),` +
    `and properties about the entity, if any (no more than 3). ` + 
    `Properties have to be adjectives describing the entity and their value should represent the intensity of the property (on a scale from 1 to 10).`


    const entityExtractor = new JSONPrompt({ prompt:  prompt}, ENTITY_SCHEMA)
    useModelStore.getState().setEntityNodes([]);

    entityExtractor.onPartialResponse = (partialResult) => {
        const newEntities = extractedEntitiesToNodeEntities(partialResult.result);
        const oldEntities = useModelStore.getState().entityNodes;

        // Reuse the position of the entities that already existed
        const entities = newEntities.map((newEntity) => {
            const oldEntity = oldEntities.find(e => e.data.name === newEntity.data.name);
            if (oldEntity && oldEntity.position) newEntity.position = oldEntity.position;
            if (oldEntity && oldEntity.measured) newEntity.measured = oldEntity.measured;

            return newEntity;
        });
        
        useModelStore.getState().setEntityNodes(entities);
        LayoutUtils.optimizeNodeLayout("entity", entities, useModelStore.getState().setEntityNodes, {x: center.x, y: center.y}, 120);
    }

    return new Promise((resolve, reject) => {
        entityExtractor.execute().then((result) => {
            console.log("Extracted entities:", result.result.entities);
            resolve(useModelStore.getState().entityNodes);
    })
    });
}