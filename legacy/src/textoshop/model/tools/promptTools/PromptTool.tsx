import { ExecutablePrompt, PromptResult, useModelStore } from "../../Model";

export class PromptTool<I, P, O> {
    input: I
    cache: Map<string, O> = new Map<string, O>()

    constructor(input: I) {
        this.input = input
    }

    execute(parameters : P) : Promise<O> {
        return new Promise<O>((resolve, reject) => {
            resolve(this.input as unknown as O);
        });
    }

    cachedExecute(parameters : P) : Promise<O> {
        const key = JSON.stringify(parameters)
        if (this.cache.has(key)) {
            return new Promise<O>((resolve, reject) => {
                resolve(this.cache.get(key) as O);
            });
        }

        return this.execute(parameters).then(result => {
            this.cache.set(key, result)
            return result
        });
    }

    isValueCached(value : O) : boolean {
        return Array.from(this.cache.values()).includes(value)
    }
}

export class BasePrompt<O> {
    execute(): Promise<O> {
        return new Promise<O>((resolve, reject) => {
            resolve(null as any);
        });
    }
}

export class SimplePrompt extends BasePrompt<PromptResult> {
    prompt: ExecutablePrompt;
    constructor(prompt: ExecutablePrompt) {
        super();
        this.prompt = prompt;
    }

    execute(): Promise<PromptResult> {
        return useModelStore.getState().executePrompt(this.prompt);
    }
}

export class MultiplePrompts<O> extends BasePrompt<O[]> {
    prompts: BasePrompt<O>[];
    constructor(prompts: BasePrompt<O>[]) {
        super();
        this.prompts = prompts;
    }

    execute(): Promise<O[]> {
        return Promise.all(this.prompts.map(prompt => prompt.execute()));
    }
}

export class ParallelPrompts<O> extends BasePrompt<{ [key: string]: O }> {
    prompts: { [key: string]: BasePrompt<O> };
    constructor(prompts: { [key: string]: BasePrompt<O> }) {
        super();
        this.prompts = prompts;
    }

    execute(): Promise<{ [key: string]: O }> {
        return Promise.all(Object.keys(this.prompts).map(key => this.prompts[key].execute())).then(results => {
            const result : { [key: string]: O } = {}
            Object.keys(this.prompts).forEach((key, index) => {
                result[key] = results[index]
            });
            return result
        });
    }
}