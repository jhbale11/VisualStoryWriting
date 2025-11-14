# Translation System Setup Guide

This guide will help you set up and use the custom workflow-based translation system for Korean to Japanese/English translation.

**Note:** This system uses a browser-native workflow engine (SimpleWorkflow) instead of LangGraph to avoid `AsyncLocalStorage` compatibility issues.

## Prerequisites

- Node.js 18+ installed
- API keys for at least one LLM provider (Gemini, OpenAI, or Anthropic)

## Installation

1. Install dependencies:

```bash
npm install
```

The required packages are:
- `@langchain/core` - LangChain core utilities (messages, models)
- `@langchain/google-genai` - Google Gemini integration
- `@langchain/openai` - OpenAI integration
- `@langchain/anthropic` - Anthropic Claude integration

**Note:** We use a custom `SimpleWorkflow` engine instead of `@langchain/langgraph` to avoid Node.js dependencies (AsyncLocalStorage) that don't work in browsers.

## Configuration

### API Keys Setup

Create a `.env` file in the project root with your API keys:

```env
# OpenAI API Key (https://platform.openai.com/api-keys)
# REQUIRED for Review & Edit tools (Tone Picker, Synonym, AI Review, etc.)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API Key (https://ai.google.dev/)
# For translation workflow
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Anthropic API Key (https://console.anthropic.com/)
# Optional - for translation workflow
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Important Notes:**
- **VITE_OPENAI_API_KEY is REQUIRED** for the Review & Edit tab to work properly
- All AI tools in Review & Edit use `gpt-5-mini-2025-08-07` with temperature=1 (fast and cost-effective)
- All keys must be prefixed with `VITE_` to be accessible in the browser
- After creating or modifying the `.env` file, **restart the development server** (`npm run dev`)
- You can use different providers for different agents in the translation workflow

### Getting API Keys

- **Gemini**: Visit [Google AI Studio](https://ai.google.dev/) and create an API key
- **OpenAI**: Visit [OpenAI Platform](https://platform.openai.com/api-keys) and create an API key
- **Anthropic**: Visit [Anthropic Console](https://console.anthropic.com/) and create an API key

## Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open your browser and navigate to the launcher page

3. Click "Open Translation System" button

## Usage

### Home Screen Overview

The home screen displays:
- **Statistics Dashboard**: Total projects, glossary projects, translation projects, and active tasks
- **Tabbed Interface**: 
  - **📝 Translation Projects**: Full translation pipeline projects
  - **📚 Glossary Building**: Glossary extraction projects

Each tab shows:
- Project count badge
- Quick create button
- Empty state with helpful description
- Grid of project cards

### Creating a Glossary Project

1. Click the **📚 Glossary Building** tab
2. Click "+ New Glossary" button
3. Fill in the details:
   - **Project Name**: Name for your glossary
   - **Source Text**: Upload Korean text file or paste text
   - **Target Language**: Select Japanese or English
4. Click "Create Project"

### Creating a Translation Project

1. Click the **📝 Translation Projects** tab (default)
2. Click "+ New Translation" button
3. Fill in the project details:
   - **Project Name**: Give your project a name
   - **Target Language**: Select Japanese or English
   - **Source Text**: Upload a Korean text file or paste text directly
   - **Chunk Settings**: Configure chunk size and overlap for processing
   - **Agent Configuration**: Select LLM models for each translation stage

4. Click "Create Project"

### Glossary Building Workflow

Glossary projects extract structured information from Korean text:

1. **AI Analysis**: The glossary agent analyzes your Korean text
2. **Extraction**: Automatically identifies:
   - **Characters**: Names, age, gender, personality, speaking tone
   - **Terms**: Important terminology, items, abilities, ranks
   - **Places**: Locations mentioned in the text
3. **Output**: Structured glossary in JSON format
4. **Export**: Download or use in translation projects

**Use Cases:**
- Build reusable glossaries for series/franchises
- Maintain character consistency across volumes
- Create reference materials for translators
- Analyze story elements before translation

### Translation Pipeline

Translation projects use a comprehensive multi-stage pipeline:

1. **Glossary Generation**: Extracts characters, terms, and places from the source text
2. **Translation**: Translates Korean text using the glossary
3. **Enhancement**: Improves literary quality while preserving meaning
4. **Quality Check**: Evaluates translation quality and suggests improvements
5. **Proofreading**: Final polish for naturalness (optional)
6. **Layout**: Formats the text according to conventions

### Running a Glossary Project

1. After creating a glossary project, click "Generate Glossary"
2. Wait for glossary generation to complete
3. Review extracted characters, terms, and places in the Glossary tab
4. Download the glossary JSON file
5. Optionally use this glossary in translation projects

### Running a Translation Project

1. After creating a translation project, click "Generate Glossary"
2. Wait for glossary generation to complete
3. Review and edit the glossary if needed
4. Click "Start Translation" to begin the translation process
5. Monitor progress in the Overview tab
6. Review chunks and quality scores in the Chunks tab
7. Download the final translation when complete

### Managing Projects

- **View Projects**: All projects are listed on the main page
- **Select Project**: Click on a project card to open details
- **Delete Project**: Click the trash icon on a project card
- **Progress Tracking**: View real-time progress for active translations

## Features

### Multi-Agent Architecture

Each stage of translation is handled by a specialized agent:

- **Glossary Agent**: Analyzes text and builds character/term glossaries
- **Translation Agent**: Performs initial translation using glossary
- **Enhancement Agent**: Improves literary quality
- **Quality Agent**: Checks quality and identifies issues
- **Proofreader Agent**: Final polish for naturalness
- **Layout Agent**: Formats output

### Task Management

- **Background Processing**: Tasks run asynchronously without blocking UI
- **Progress Tracking**: Real-time progress updates for all tasks
- **Task Cancellation**: Cancel running tasks if needed
- **Error Handling**: Graceful error handling with detailed messages

### Project Persistence

- **Local Storage**: Projects are persisted in browser local storage
- **Auto-save**: Changes are automatically saved
- **Export**: Download translations as text files

## Architecture

### Directory Structure

```
src/translation/
├── types.ts                    # TypeScript type definitions
├── llm/
│   └── clients.ts             # LLM client factory
├── agents/
│   ├── GlossaryAgent.ts       # Glossary generation
│   ├── TranslationAgent.ts    # Translation
│   ├── EnhancementAgent.ts    # Literary enhancement
│   ├── QualityAgent.ts        # Quality checking
│   ├── ProofreaderAgent.ts    # Proofreading
│   └── LayoutAgent.ts         # Formatting
├── workflow/
│   └── TranslationWorkflow.ts # LangGraph workflow
├── store/
│   └── TranslationStore.ts    # Zustand state management
└── services/
    └── TaskRunner.ts          # Background task execution

src/view/translation/
├── TranslationMain.tsx        # Main view
├── ProjectList.tsx            # Project list
├── CreateProjectModal.tsx     # Project creation
└── ProjectDetail.tsx          # Project details & controls
```

### Custom Workflow Engine

The translation workflow is implemented using our custom `SimpleWorkflow` engine:

```typescript
START -> translate -> enhance -> quality_check -> proofread -> layout -> END
                          ↑            |
                          └────────────┘
                        (re-enhance if quality fails)
```

**Key Features:**
- ✅ Browser-native (no Node.js dependencies)
- ✅ State management with partial updates
- ✅ Conditional routing based on state
- ✅ Sequential node execution
- ✅ Error handling and recovery
- ✅ Progress tracking

See `SIMPLE_WORKFLOW.md` for detailed architecture documentation.

## Troubleshooting

### API Key Issues

If you see "API key not found" errors:
1. Verify your `.env` file exists and contains the correct keys
2. Make sure keys are prefixed with `VITE_`
3. Restart the development server after adding keys

### Translation Errors

If translation fails:
1. Check that glossary was generated successfully
2. Verify API key has sufficient quota
3. Try reducing chunk size if text is too long
4. Check browser console for detailed error messages

### Performance

For large texts:
- Use smaller chunk sizes (2000-4000 characters)
- Reduce overlap to speed up processing
- Consider using faster models like `gpt-4o-mini` or `gemini-2.0-flash`

## Advanced Configuration

### Custom Prompts

You can customize prompts for each agent during project creation:
1. Configure agent settings in the "Agent Configuration" section
2. Each agent has provider, model, and temperature settings
3. Prompts are auto-selected based on target language

### Model Selection

Recommended models:
- **Fast & Cost-effective**: `gemini-2.0-flash-exp`, `gpt-4o-mini`
- **High Quality**: `claude-sonnet-4`, `gpt-4o`, `gemini-2.0-pro`
- **Japanese**: Use Japanese-tuned prompts (automatically selected)

## License

This translation system is part of the Visual Story Writing project.

