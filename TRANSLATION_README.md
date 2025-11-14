# Translation System with SimpleWorkflow

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up API keys in .env
VITE_GEMINI_API_KEY=your_key_here
VITE_OPENAI_API_KEY=your_key_here
VITE_ANTHROPIC_API_KEY=your_key_here

# 3. Run the app
npm run dev

# 4. Open translation system
# Navigate to launcher → Click "Open Translation System"
```

## What's New

### ✨ SimpleWorkflow Engine

We've replaced LangGraph with a **custom browser-native workflow engine** to avoid `AsyncLocalStorage` compatibility issues.

**Why?** LangGraph requires Node.js's `async_hooks` module which doesn't work in browsers, even with polyfills.

**Benefits:**
- ✅ No more AsyncLocalStorage errors
- ✅ Smaller bundle size (800KB → 50KB)
- ✅ Better performance
- ✅ Easier to debug
- ✅ Full browser compatibility

See `BROWSER_COMPATIBILITY.md` for detailed explanation.

## Features

### 📚 Glossary Building
- AI-powered character extraction (name, age, gender, personality, tone)
- Term identification (items, abilities, ranks)
- Location mapping
- JSON export

### 📝 Translation Pipeline
Multi-stage AI processing:
1. **Translation**: Initial Korean → Japanese/English
2. **Enhancement**: Literary quality improvement
3. **Quality Check**: Automated scoring
4. **Proofreading**: Final polish (optional)
5. **Layout**: Formatting

### 🎨 Modern UI
- Tabbed interface (Glossary vs Translation)
- Real-time progress tracking
- Statistics dashboard
- Project management
- Task cancellation

## Architecture

```
src/translation/
├── workflow/
│   ├── SimpleWorkflow.ts          # Custom workflow engine ⭐
│   └── TranslationWorkflow.ts     # Translation pipeline
├── agents/
│   ├── GlossaryAgent.ts
│   ├── TranslationAgent.ts
│   ├── EnhancementAgent.ts
│   ├── QualityAgent.ts
│   ├── ProofreaderAgent.ts
│   └── LayoutAgent.ts
├── llm/
│   └── clients.ts                 # LLM client factory
├── store/
│   └── TranslationStore.ts        # Zustand state management
└── services/
    └── TaskRunner.ts              # Background task execution
```

## Workflow Engine

### Example: Simple Workflow

```typescript
import { createWorkflow, START, END } from './SimpleWorkflow';

interface MyState {
  input: string;
  result?: string;
}

const workflow = createWorkflow<MyState>();

// Add processing node
workflow.addNode('process', async (state) => {
  return { result: state.input.toUpperCase() };
});

// Add edges
workflow.addEdge(START, 'process');
workflow.addEdge('process', END);

// Execute
const graph = workflow.compile();
const result = await graph.invoke({ input: 'hello' });
// { input: 'hello', result: 'HELLO' }
```

### Translation Workflow

```typescript
const workflow = createWorkflow<TranslationState>();

workflow.addNode('translate', translateNode);
workflow.addNode('enhance', enhanceNode);
workflow.addNode('quality_check', qualityCheckNode);
workflow.addNode('proofread', proofreadNode);
workflow.addNode('layout', layoutNode);

workflow.addEdge(START, 'translate');
workflow.addEdge('translate', 'enhance');

// Conditional: run quality check?
workflow.addConditionalEdges(
  'enhance',
  (state) => state.qualityAgent ? 'quality_check' : 'proofread',
  { quality_check: 'quality_check', proofread: 'proofread' }
);

// Conditional: re-enhance if quality fails?
workflow.addConditionalEdges(
  'quality_check',
  (state) => state.needsReenhancement ? 'enhance' : 'proofread',
  { enhance: 'enhance', proofread: 'proofread' }
);

workflow.addEdge('proofread', 'layout');
workflow.addEdge('layout', END);
```

## Documentation

- **TRANSLATION_SETUP.md** - Complete setup guide
- **SIMPLE_WORKFLOW.md** - Workflow engine API reference
- **BROWSER_COMPATIBILITY.md** - Why we don't use LangGraph
- **TRANSLATION_UI_GUIDE.md** - UI usage guide

## LLM Providers

Supports three providers (configure any or all):

### Gemini (Recommended)
- Fast and cost-effective
- Model: `gemini-2.0-flash-exp`
- API: https://ai.google.dev/

### OpenAI
- High quality
- Models: `gpt-4o`, `gpt-4o-mini`
- API: https://platform.openai.com/

### Anthropic
- Best quality
- Model: `claude-sonnet-4`
- API: https://console.anthropic.com/

## Usage Examples

### Create Glossary Project
1. Go to 📚 Glossary Building tab
2. Click "+ New Glossary"
3. Upload Korean text
4. Select target language
5. Click "Create Project"
6. Click "Generate Glossary"
7. Review extracted data

### Create Translation Project
1. Go to 📝 Translation Projects tab
2. Click "+ New Translation"
3. Upload Korean text
4. Configure settings:
   - Chunk size: 4000
   - Enable proofreader: Yes
   - Select models for each stage
5. Click "Create Project"
6. Generate glossary
7. Start translation
8. Monitor progress
9. Download final translation

## Configuration

### Chunk Settings
- **Chunk Size**: 2000-6000 characters
  - Smaller = more reliable, more API calls
  - Larger = fewer calls, may timeout
  - Default: 4000 (recommended)

- **Overlap**: 100-300 characters
  - Ensures continuity between chunks
  - Default: 200

### Agent Models
Configure different models for each stage:
- **Glossary**: Fast model (gemini-flash)
- **Translation**: Quality model (gpt-4o, claude)
- **Enhancement**: Quality model
- **Quality**: Fast model
- **Proofreader**: Quality model
- **Layout**: Fast model

### Custom Prompts
You can customize prompts for each agent when creating a project.

## Performance

### Typical Processing Time

For a 10,000 character text (Korean novel chapter):

| Stage | Time | API Calls |
|-------|------|-----------|
| Glossary | 30s | 1 |
| Translation (3 chunks) | 90s | 3 |
| Enhancement (3 chunks) | 90s | 3 |
| Quality Check (3 chunks) | 45s | 3 |
| Proofreading (3 chunks) | 60s | 3 |
| Layout (3 chunks) | 45s | 3 |
| **Total** | **~6 min** | **16** |

### Cost Estimate (Gemini Flash)
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- 10,000 char chapter: ~$0.10-0.30

## Troubleshooting

### AsyncLocalStorage Error
✅ Fixed! We use SimpleWorkflow which doesn't need AsyncLocalStorage.

### API Key Errors
- Check `.env` file has correct keys
- Keys must be prefixed with `VITE_`
- Restart dev server after adding keys

### Translation Fails
- Check API quota/credits
- Try smaller chunk size
- Check browser console for errors

### Progress Stuck
- Refresh page
- Check task status in Overview tab
- Cancel and retry task

## Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Any modern browser with ES2020+ support

No special configuration needed!

## Development

### Project Structure
```
translation/
├── types.ts              # TypeScript types
├── workflow/
│   ├── SimpleWorkflow.ts # Workflow engine
│   └── TranslationWorkflow.ts
├── agents/               # 6 processing agents
├── llm/clients.ts       # LLM factory
├── store/               # State management
└── services/            # Task runner

view/translation/
├── TranslationMain.tsx  # Home screen
├── ProjectList.tsx      # Project cards
├── CreateProjectModal.tsx
└── ProjectDetail.tsx    # Project view
```

### Adding a New Agent

```typescript
// 1. Create agent
export class MyAgent {
  constructor(private client: BaseChatModel) {}
  
  async process(text: string): Promise<string> {
    const response = await this.client.invoke([
      new HumanMessage(text)
    ]);
    return response.content as string;
  }
}

// 2. Add to workflow
workflow.addNode('my_stage', async (state) => {
  const agent = new MyAgent(client);
  const result = await agent.process(state.text);
  return { myResult: result };
});

// 3. Connect to pipeline
workflow.addEdge('previous_stage', 'my_stage');
workflow.addEdge('my_stage', 'next_stage');
```

### Adding a New LLM Provider

```typescript
// In llm/clients.ts
case 'my-provider':
  return new MyChatModel({
    modelName: config.model,
    temperature: config.temperature,
    apiKey: apiKey,
  });
```

## License

This translation system is part of the Visual Story Writing project.

## Credits

- LangChain for LLM integrations
- NextUI for UI components
- Zustand for state management
- Custom SimpleWorkflow engine (no external dependencies!)



