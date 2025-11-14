export class Tool {
    originalText: string

    constructor(originalText: string) {
        this.originalText = originalText
    }

    execute() {
        return this.originalText;
    }
}