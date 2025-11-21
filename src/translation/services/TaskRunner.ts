import { useTranslationStore } from '../store/TranslationStore';
import { GlossaryAgent } from '../agents/GlossaryAgent';
import { TranslationWorkflow } from '../workflow/TranslationWorkflow';
import { LLMClientFactory } from '../llm/clients';

export class TaskRunner {
  private runningTasks: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private initialized = false;

  /**
   * Initialize the task runner and recover any interrupted tasks
   * This should be called once when the app starts
   */
  initialize() {
    if (this.initialized) {
      return;
    }
    
    this.initialized = true;
    
    // Check for tasks that were running before page refresh
    const store = useTranslationStore.getState();
    const interruptedTasks = Object.values(store.tasks).filter(
      task => task.status === 'running'
    );
    
    if (interruptedTasks.length > 0) {
      console.log(`Found ${interruptedTasks.length} interrupted tasks, marking as pending...`);
      
      // Mark interrupted tasks as pending so they can be manually restarted
      interruptedTasks.forEach(task => {
        store.updateTask(task.id, {
          status: 'pending',
          message: 'Task was interrupted (page refresh). Please restart if needed.',
        });
      });
    }
  }

  async runTask(taskId: string): Promise<void> {
    if (this.runningTasks.has(taskId)) {
      console.warn(`Task ${taskId} is already running`);
      return;
    }

    this.runningTasks.add(taskId);
    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    const store = useTranslationStore.getState();
    const task = store.getTask(taskId);

    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    try {
      store.updateTask(taskId, { status: 'running', progress: 0, message: 'Starting...' });

      switch (task.type) {
        case 'glossary':
          await this.runGlossaryTask(taskId, task.projectId, abortController.signal);
          break;
        case 'translation':
          await this.runTranslationTask(taskId, task.projectId, abortController.signal);
          break;
        case 'retranslate':
          if (task.chunkId) {
            await this.runRetranslateTask(taskId, task.projectId, task.chunkId, abortController.signal);
          }
          break;
        case 'glossary_extraction':
          await this.runGlossaryExtractionTask(taskId, abortController.signal);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      if (!abortController.signal.aborted) {
        store.updateTask(taskId, {
          status: 'completed',
          progress: 1,
          message: 'Completed successfully',
        });
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        store.updateTask(taskId, {
          status: 'cancelled',
          message: 'Task was cancelled',
        });
      } else {
        store.updateTask(taskId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Task failed',
        });
      }
    } finally {
      this.runningTasks.delete(taskId);
      this.abortControllers.delete(taskId);
    }
  }

  cancelTask(taskId: string): void {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }
    this.runningTasks.delete(taskId);
    useTranslationStore.getState().updateTask(taskId, { status: 'cancelled' });
  }

  private async runGlossaryTask(
    taskId: string,
    projectId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    console.log('[TaskRunner] Starting glossary task for project:', projectId);
    store.updateProject(projectId, { status: 'glossary_running' });
    store.updateTask(taskId, { progress: 0.1, message: 'Analyzing text...' });

    if (signal.aborted) throw new Error('Task aborted');

    // Create glossary agent
    const glossaryConfig = project.agent_configs.glossary;
    if (!glossaryConfig) {
      throw new Error('Glossary agent not configured');
    }

    const client = LLMClientFactory.createClient(glossaryConfig);
    const agent = new GlossaryAgent(client, project.language);

    store.updateTask(taskId, { progress: 0.3, message: 'Extracting glossary...' });

    if (signal.aborted) throw new Error('Task aborted');

    const glossary = await agent.analyzeText(project.file_content);

    console.log('[TaskRunner] Glossary extracted, saving...', {
      projectId,
      glossaryKeys: Object.keys(glossary),
    });
    
    store.updateTask(taskId, { progress: 0.9, message: 'Saving glossary...' });
    store.setGlossary(projectId, glossary);
    
    console.log('[TaskRunner] Glossary saved successfully');
  }

  private async runTranslationTask(
    taskId: string,
    projectId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    console.log('[TaskRunner] Translation task - project state:', {
      projectId,
      hasGlossary: !!project.glossary,
      status: project.status,
    });

    if (!project.glossary) {
      throw new Error('Glossary not available. Please generate glossary first.');
    }

    store.updateProject(projectId, { status: 'translating' });

    const workflow = new TranslationWorkflow({
      agentConfigs: project.agent_configs,
      glossary: project.glossary,
      maxRetries: project.max_retries,
      enableProofreader: project.enable_proofreader,
      targetLanguage: project.language,
      customPrompts: project.prompts,
    });

    const chunks = project.chunks;
    const totalChunks = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) throw new Error('Task aborted');

      const chunk = chunks[i];
      
      if (chunk.status === 'completed') {
        // Skip already completed chunks
        continue;
      }

      const progress = i / totalChunks;
      store.updateTask(taskId, {
        progress,
        message: `Translating chunk ${i + 1}/${totalChunks}...`,
      });

      // Mark chunk as processing
      store.updateChunk(projectId, chunk.id, { status: 'processing' });

      try {
        const result = await workflow.processChunk(
          chunk.text,
          chunk.metadata
        );

        // Update chunk with results
        store.updateChunk(projectId, chunk.id, {
          status: 'completed',
          translations: {
            tagged: result.tagged,
            translated: result.translated,
            enhanced: result.enhanced,
            proofread: result.proofread,
            final: result.final,
            qualityScore: result.qualityScore,
            paragraphMatches: result.paragraphMatches,
          },
        });

        // Update overall progress
        const completedChunks = chunks.filter(c => c.status === 'completed').length + 1;
        store.updateProject(projectId, {
          translation_progress: completedChunks / totalChunks,
        });
      } catch (error) {
        store.updateChunk(projectId, chunk.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Translation failed',
        });
        throw error;
      }
    }

    store.updateProject(projectId, {
      status: 'translation_completed',
      translation_progress: 1,
    });
  }

  private async runRetranslateTask(
    taskId: string,
    projectId: string,
    chunkId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const chunk = project.chunks.find(c => c.id === chunkId);
    if (!chunk) {
      throw new Error('Chunk not found');
    }

    store.updateTask(taskId, { progress: 0.1, message: 'Initializing...' });

    const workflow = new TranslationWorkflow({
      agentConfigs: project.agent_configs,
      glossary: project.glossary,
      maxRetries: project.max_retries,
      enableProofreader: project.enable_proofreader,
      targetLanguage: project.language,
      customPrompts: project.prompts,
    });

    store.updateChunk(projectId, chunkId, { status: 'processing' });
    store.updateTask(taskId, { progress: 0.3, message: 'Retranslating...' });

    if (signal.aborted) throw new Error('Task aborted');

    const result = await workflow.processChunk(
      chunk.text,
      chunk.metadata
    );

    store.updateTask(taskId, { progress: 0.9, message: 'Saving...' });

    store.updateChunk(projectId, chunkId, {
      status: 'completed',
      translations: {
        tagged: result.tagged,
        translated: result.translated,
        enhanced: result.enhanced,
        proofread: result.proofread,
        final: result.final,
        qualityScore: result.qualityScore,
        paragraphMatches: result.paragraphMatches,
      },
    });
  }

  private async runGlossaryExtractionTask(
    taskId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const task = store.getTask(taskId);
    
    if (!task || !task.metadata) {
      throw new Error('Task metadata not found');
    }
    
    const { text, targetLanguage, vswProjectId } = task.metadata as {
      text: string;
      targetLanguage: 'en' | 'ja';
      vswProjectId: string;
    };
    
    // Import glossary store dynamically
    const { useGlossaryStore, initGemini } = await import('../../model/GlossaryModel');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY not found');
    }
    
    initGemini(apiKey);
    
    store.updateTask(taskId, { progress: 0, message: 'Preparing text...' });
    
    // Split text into chunks
    const chunkSize = 8000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    
    const totalChunks = chunks.length;
    
    store.updateTask(taskId, { 
      progress: 0.05, 
      message: `Processing ${totalChunks} chunks...` 
    });
    
    // Reset and initialize glossary store
    useGlossaryStore.getState().reset();
    useGlossaryStore.getState().setTargetLanguage(targetLanguage);
    useGlossaryStore.getState().setFullText(text);
    useGlossaryStore.getState().setTotalChunks(totalChunks);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) throw new Error('Task aborted');
      
      const chunk = chunks[i];
      const progress = 0.05 + ((i + 1) / totalChunks) * 0.85;
      
      store.updateTask(taskId, { 
        progress,
        message: `Processing chunk ${i + 1}/${totalChunks}...` 
      });
      
      try {
        await useGlossaryStore.getState().processChunk(chunk, i);
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        // Continue with other chunks even if one fails
      }
    }
    
    if (signal.aborted) throw new Error('Task aborted');
    
    // Consolidate results
    store.updateTask(taskId, { 
      progress: 0.95,
      message: 'Consolidating results...' 
    });
    
    try {
      await useGlossaryStore.getState().consolidateResults();
    } catch (error) {
      console.error('Error consolidating results:', error);
    }
    
    // Save to localStorage
    store.updateTask(taskId, { 
      progress: 0.98,
      message: 'Saving project...' 
    });
    
    const glossaryState = useGlossaryStore.getState();
    const raw = localStorage.getItem('vsw.projects') || '[]';
    const arr = JSON.parse(raw);
    
    // Update existing project or create new one
    const existingIndex = arr.findIndex((p: any) => p.id === vswProjectId);
    
    const project = {
      id: vswProjectId,
      name: arr[existingIndex]?.name || `Glossary Project ${new Date().toLocaleString()}`,
      updatedAt: Date.now(),
      glossary: {
        characters: glossaryState.characters,
        events: glossaryState.events,
        locations: glossaryState.locations,
        terms: glossaryState.terms,
        story_summary: glossaryState.story_summary,
        key_events_and_arcs: glossaryState.key_events_and_arcs,
        honorifics: glossaryState.honorifics,
        recurring_phrases: glossaryState.recurring_phrases,
        world_building_notes: glossaryState.world_building_notes,
        style_guide: glossaryState.style_guide,
        target_language: glossaryState.target_language,
        fullText: glossaryState.fullText,
      },
      view: arr[existingIndex]?.view || {
        entityNodes: [],
        actionEdges: [],
        locationNodes: [],
        textState: [],
        isReadOnly: false,
        relationsPositions: {}
      }
    };
    
    if (existingIndex >= 0) {
      arr[existingIndex] = project;
    } else {
      arr.unshift(project);
    }
    
    localStorage.setItem('vsw.projects', JSON.stringify(arr));
    localStorage.setItem('vsw.currentProjectId', vswProjectId);
    
    store.updateTask(taskId, { 
      progress: 1,
      message: 'Glossary extraction completed!' 
    });
  }

  isTaskRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId);
  }
}

// Singleton instance
export const taskRunner = new TaskRunner();

// Initialize on module load
if (typeof window !== 'undefined') {
  // Wait a bit for store to be hydrated from localStorage
  setTimeout(() => {
    taskRunner.initialize();
  }, 100);
}

