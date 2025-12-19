import { useTranslationStore } from '../store/TranslationStore';
import { GlossaryAgent } from '../agents/GlossaryAgent';
import { PublishAgent } from '../agents/PublishAgent';
import { TranslationWorkflow } from '../workflow/TranslationWorkflow';
import { LLMClientFactory } from '../llm/clients';
import { glossaryProjectStorage } from '../../glossary/services/GlossaryProjectStorage';
import { DEFAULT_PUBLISH_PROMPT } from '../prompts/defaultPrompts';
import { browserStorage } from './BrowserStorage';
import { ParagraphMatchingAgent } from '../agents/ParagraphMatchingAgent';
import { ReviewAgent } from '../agents/ReviewAgent';
import type { Chunk, TranslationProject } from '../types';
import type { GlossaryProjectRecord } from '../../glossary/types';

export class TaskRunner {
  private runningTasks: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private initialized = false;

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private getBestEnglishText(chunk: Chunk): string {
    return (
      chunk.draft_final ||
      chunk.translations?.final ||
      chunk.translations?.proofread ||
      chunk.translations?.enhanced ||
      chunk.translations?.translated ||
      ''
    );
  }

  private computePreviousContext(project: TranslationProject, chunk: Chunk): string | undefined {
    const idx = chunk.index ?? chunk.metadata?.chunk_index ?? 0;
    if (idx <= 0) return undefined;
    const prev =
      project.chunks.find(c => (c.index ?? c.metadata?.chunk_index) === idx - 1) ||
      project.chunks[idx - 1];
    if (!prev) return undefined;
    const ctx = this.getBestEnglishText(prev);
    if (!ctx) return undefined;
    // Keep the tail to avoid huge prompts; enough for tone/term continuity.
    const maxChars = 1800;
    return ctx.length > maxChars ? ctx.slice(-maxChars) : ctx;
  }

  private isStale(taskId: string, runId: string, signal: AbortSignal): boolean {
    if (signal.aborted) return true;
    const task = useTranslationStore.getState().getTask(taskId);
    return task?.metadata?.runId !== runId || task.status !== 'running';
  }

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
      const runId = this.generateRunId();
      store.updateTask(taskId, {
        status: 'running',
        progress: 0,
        message: 'Starting...',
        metadata: { ...(task.metadata || {}), runId, startedAt: new Date().toISOString() },
      });

      switch (task.type) {
        case 'glossary':
          await this.runGlossaryTask(taskId, task.projectId, abortController.signal);
          break;
        case 'translation':
          await this.runTranslationTask(taskId, task.projectId, abortController.signal, runId);
          break;
        case 'retranslate':
          if (task.chunkId) {
            await this.runRetranslateTask(taskId, task.projectId, task.chunkId, abortController.signal, runId);
          }
          break;
        case 'match_paragraphs':
          if (task.chunkId) {
            await this.runMatchParagraphsTask(taskId, task.projectId, task.chunkId, abortController.signal, runId);
          } else {
            throw new Error('Chunk ID required for match paragraphs task');
          }
          break;
        case 'review_chunk':
          if (task.chunkId) {
            await this.runReviewChunkTask(taskId, task.projectId, task.chunkId, abortController.signal, runId);
          } else {
            throw new Error('Chunk ID required for review chunk task');
          }
          break;
        case 'glossary_extraction':
          await this.runGlossaryExtractionTask(taskId, abortController.signal);
          break;
        case 'publish':
          await this.runPublishTask(taskId, task.projectId, abortController.signal);
          break;
      case 'publish_chunk':
        if (task.chunkId) {
          await this.runPublishChunkTask(taskId, task.projectId, task.chunkId, abortController.signal);
        } else {
          throw new Error('Chunk ID required for publish chunk task');
        }
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
    const store = useTranslationStore.getState();
    const task = store.getTask(taskId);
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }
    this.runningTasks.delete(taskId);
    store.updateTask(taskId, { status: 'cancelled' });
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
    signal: AbortSignal,
    runId: string
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

    const totalChunks = project.chunks.length;

    for (let i = 0; i < totalChunks; i++) {
      if (signal.aborted) throw new Error('Task aborted');
      if (this.isStale(taskId, runId, signal)) return;

      // Always use the latest project snapshot so edits/saves from other chunks are preserved.
      const liveProject = await store.getProject(projectId);
      if (!liveProject) throw new Error('Project not found');

      const chunk = liveProject.chunks[i];

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
        const previousContext = this.computePreviousContext(liveProject, chunk);
        const result = await workflow.processChunk(
          chunk.text,
          chunk.metadata,
          previousContext
        );

        if (this.isStale(taskId, runId, signal)) return;

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
            reviewIssues: result.reviewIssues,
          },
        });

        // Flush to IndexedDB promptly so completed chunks never rely on localStorage
        const latest = await store.getProject(projectId);
        if (latest) {
          await browserStorage.saveProject(latest);
        }

        // Update overall progress
        const completedChunks = (latest?.chunks || liveProject.chunks).filter(c => c.status === 'completed').length;
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
    signal: AbortSignal,
    runId: string
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

    const task = store.getTask(taskId);
    const existingSnapshot = task?.metadata?.previousContextSnapshot as string | undefined;
    const previousContextSnapshot = existingSnapshot ?? this.computePreviousContext(project, chunk);
    store.updateTask(taskId, {
      metadata: { ...(task?.metadata || {}), previousContextSnapshot },
    });

    const result = await workflow.processChunk(
      chunk.text,
      chunk.metadata,
      previousContextSnapshot
    );

    store.updateTask(taskId, { progress: 0.9, message: 'Saving...' });

    if (this.isStale(taskId, runId, signal)) return;

    store.updateChunk(projectId, chunkId, {
      status: 'completed',
      // CRITICAL: Never mutate Korean source text during review/retranslate.
      // Paragraph matching produces a Korean segmentation aligned to English layout,
      // which should live ONLY inside `translations.paragraphMatches`, not overwrite `chunk.text`.
      text: chunk.text,
      translations: {
        tagged: result.tagged,
        translated: result.translated,
        enhanced: result.enhanced,
        proofread: result.proofread,
        final: result.final,
        qualityScore: result.qualityScore,
        paragraphMatches: result.paragraphMatches,
        reviewIssues: result.reviewIssues,
      },
    });

    // Flush to IndexedDB promptly
    const latest = await store.getProject(projectId);
    if (latest) {
      await browserStorage.saveProject(latest);
    }
  }

  private async runMatchParagraphsTask(
    taskId: string,
    projectId: string,
    chunkId: string,
    signal: AbortSignal,
    runId: string
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);
    if (!project) throw new Error('Project not found');
    const chunk = project.chunks.find(c => c.id === chunkId);
    if (!chunk) throw new Error('Chunk not found');

    store.updateTask(taskId, { progress: 0.1, message: 'Preparing paragraph matching...' });
    if (signal.aborted) throw new Error('Task aborted');

    const englishText = this.getBestEnglishText(chunk);
    if (!englishText) throw new Error('No English text found for this chunk');

    store.updateTask(taskId, { progress: 0.3, message: 'Matching paragraphs...' });
    const matchingAgent = new ParagraphMatchingAgent();
    const matchResult = await matchingAgent.matchParagraphs(chunk.text, englishText);

    store.updateTask(taskId, { progress: 0.9, message: 'Saving...' });
    if (this.isStale(taskId, runId, signal)) return;

    store.updateChunk(projectId, chunkId, {
      translations: {
        ...chunk.translations,
        paragraphMatches: matchResult,
      },
    });

    const latest = await store.getProject(projectId);
    if (latest) {
      await browserStorage.saveProject(latest);
    }
  }

  private async runReviewChunkTask(
    taskId: string,
    projectId: string,
    chunkId: string,
    signal: AbortSignal,
    runId: string
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);
    if (!project) throw new Error('Project not found');
    const chunk = project.chunks.find(c => c.id === chunkId);
    if (!chunk) throw new Error('Chunk not found');

    if (project.language !== 'en') {
      store.updateTask(taskId, { progress: 1, message: 'Review is only available for English targets. Skipped.' });
      return;
    }

    const reviewConfig = project.agent_configs.review;
    if (!reviewConfig) throw new Error('Review agent not configured');

    store.updateTask(taskId, { progress: 0.1, message: 'Initializing reviewer...' });
    if (signal.aborted) throw new Error('Task aborted');

    const client = LLMClientFactory.createClient(reviewConfig);
    const agent = new ReviewAgent(client, project.prompts?.review);

    const englishText = this.getBestEnglishText(chunk);
    if (!englishText) throw new Error('No English text found for this chunk');

    store.updateTask(taskId, { progress: 0.4, message: 'Reviewing translation...' });
    const issues = await agent.review(chunk.text, englishText);

    store.updateTask(taskId, { progress: 0.9, message: 'Saving...' });
    if (this.isStale(taskId, runId, signal)) return;

    store.updateChunk(projectId, chunkId, {
      translations: {
        ...chunk.translations,
        reviewIssues: issues,
      },
    });

    const latest = await store.getProject(projectId);
    if (latest) {
      await browserStorage.saveProject(latest);
    }
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
    const { useGlossaryStore, initGemini, serializeGlossaryState } = await import('../../model/GlossaryModel');

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

    // Resume support: if the project already has partial results, continue from the next chunk.
    let resumeFrom = 0;
    let existingProjectRecord: any = undefined;
    try {
      existingProjectRecord = await glossaryProjectStorage.getProject(vswProjectId);
      const processedFromRecord = Number(existingProjectRecord?.processedChunks || 0);
      const processedFromRaw = Number(existingProjectRecord?.glossary?.raw_chunks?.length || 0);
      resumeFrom = Math.max(0, Math.min(totalChunks, Math.max(processedFromRecord, processedFromRaw)));
    } catch (e) {
      console.warn('[TaskRunner] Failed to read existing glossary project for resume:', e);
    }

    store.updateTask(taskId, {
      progress: 0.05,
      message: resumeFrom > 0
        ? `Resuming: ${resumeFrom}/${totalChunks} chunks already processed...`
        : `Processing ${totalChunks} chunks...`
    });

    // Initialize glossary store (resume: restore snapshot so UI can show existing raw chunks)
    if (resumeFrom > 0 && existingProjectRecord?.glossary) {
      try {
        // NOTE: restoreGlossarySnapshot is in GlossaryModel; we imported serializeGlossaryState there.
        // Here we rely on the glossary store already used by processChunk/consolidateResults.
        // We set fields directly to avoid importing more helpers into TaskRunner.
        useGlossaryStore.getState().reset();
        useGlossaryStore.setState({
          ...(existingProjectRecord.glossary || {}),
          isLoading: false,
        } as any);
      } catch (e) {
        console.warn('[TaskRunner] Failed to restore glossary snapshot for resume; falling back to fresh init:', e);
        useGlossaryStore.getState().reset();
      }
    } else {
      useGlossaryStore.getState().reset();
    }

    useGlossaryStore.getState().setTargetLanguage(targetLanguage);
    useGlossaryStore.getState().setFullText(text);
    useGlossaryStore.getState().setTotalChunks(totalChunks);
    useGlossaryStore.setState({ processedChunks: resumeFrom } as any);

    // Update project record with totals (so the builder can show chunk-level progress immediately)
    try {
      const existing = await glossaryProjectStorage.getProject(vswProjectId);
      const base: GlossaryProjectRecord = existing || {
        id: vswProjectId,
        name: `Glossary Project ${new Date().toLocaleString()}`,
        updatedAt: Date.now(),
      };
      await glossaryProjectStorage.saveProject({
        ...base,
        status: 'processing',
        totalChunks,
        processedChunks: resumeFrom,
      });
    } catch (e) {
      console.warn('[TaskRunner] Failed to update glossary project totals:', e);
    }

    // Process each chunk
    for (let i = resumeFrom; i < chunks.length; i++) {
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

      // Persist incremental snapshot so the builder can open mid-run and inspect raw_chunks.
      try {
        const glossarySnapshot = serializeGlossaryState(useGlossaryStore.getState());
        const existing = await glossaryProjectStorage.getProject(vswProjectId);
        const base: GlossaryProjectRecord = existing || {
          id: vswProjectId,
          name: `Glossary Project ${new Date().toLocaleString()}`,
          updatedAt: Date.now(),
        };
        await glossaryProjectStorage.saveProject({
          ...base,
          status: 'processing',
          totalChunks,
          processedChunks: i + 1,
          glossary: glossarySnapshot,
        });
      } catch (e) {
        console.warn('[TaskRunner] Failed to persist incremental glossary snapshot:', e);
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
    const glossarySnapshot = serializeGlossaryState(glossaryState);
    const existingProject = await glossaryProjectStorage.getProject(vswProjectId);

    await glossaryProjectStorage.saveProject({
      id: vswProjectId,
      name: existingProject?.name || `Glossary Project ${new Date().toLocaleString()}`,
      updatedAt: Date.now(),
      glossary: glossarySnapshot,
      view: existingProject?.view,
      status: 'ready',
      totalChunks,
      processedChunks: totalChunks,
    });

    localStorage.setItem('vsw.currentProjectId', vswProjectId);

    store.updateTask(taskId, {
      progress: 1,
      message: 'Glossary extraction completed!'
    });
  }

  private async runPublishTask(
    taskId: string,
    projectId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);
    const task = store.getTask(taskId);

    if (!project) throw new Error('Project not found');
    if (!task || !task.metadata) throw new Error('Task metadata not found');

    const { prompt } = task.metadata as {
      prompt: string;
      sourceText: string;
    };

    store.updateTask(taskId, { progress: 0.1, message: 'Initializing Publish Agent...' });

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key not found');

    const agent = new PublishAgent(apiKey, project.agent_configs.publish || {
      provider: 'gemini',
      model: 'gemini-3-pro-preview',
      temperature: 0.3
    });

    if (signal.aborted) throw new Error('Task aborted');

    // Ensure we have chunks to process
    let chunks = [...project.chunks];
    if (chunks.length === 0) {
      if (task.metadata.sourceText) {
        chunks = [{
          id: 'chunk-0',
          text: task.metadata.sourceText,
          index: 0,
          translations: {},
          status: 'pending',
          metadata: { chunk_index: 0, total_chunks: 1, startIndex: 0, endIndex: task.metadata.sourceText.length }
        }];
      } else {
        throw new Error('No chunks found to process');
      }
    }

    const totalChunks = chunks.length;
    store.updateTask(taskId, { progress: 0.1, message: `Starting publication for ${totalChunks} chunks...` });

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (signal.aborted) throw new Error('Task aborted');

        const chunk = chunks[i];
        const progressBase = 0.1 + ((i / totalChunks) * 0.8);

        store.updateTask(taskId, {
          progress: progressBase,
          message: `Processing chunk ${i + 1}/${totalChunks}...`
        });

        store.updateChunk(projectId, chunk.id, { status: 'processing' });

        try {
          const formattedText = await agent.process(chunk.text, prompt, (chunkProgress) => {
            const currentTotalProgress = progressBase + (chunkProgress * (0.8 / totalChunks));
            store.updateTask(taskId, {
              progress: currentTotalProgress,
              message: `Processing chunk ${i + 1}/${totalChunks}...`
            });
          });

          store.updateChunk(projectId, chunk.id, {
            status: 'completed',
            translations: {
              ...chunk.translations,
              final: formattedText
            }
          });

        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError);
          store.updateChunk(projectId, chunk.id, {
            status: 'failed',
            error: chunkError instanceof Error ? chunkError.message : 'Publishing failed'
          });
        }
      }

      if (signal.aborted) throw new Error('Task aborted');

      store.updateProject(projectId, {
        status: 'translation_completed',
        updated_at: new Date().toISOString()
      });

      store.updateTask(taskId, {
        progress: 1.0,
        message: 'Publishing completed successfully',
        status: 'completed'
      });

    } catch (error) {
      console.error('Publish task failed:', error);
      throw error;
    }
  }

  private async runPublishChunkTask(
    taskId: string,
    projectId: string,
    chunkId: string,
    signal: AbortSignal
  ): Promise<void> {
    const store = useTranslationStore.getState();
    const project = await store.getProject(projectId);
    const task = store.getTask(taskId);

    if (!project) throw new Error('Project not found');
    if (!task) throw new Error('Task not found');

    const chunk = project.chunks.find(c => c.id === chunkId);
    if (!chunk) throw new Error('Chunk not found');

    const prompt =
      (task.metadata as { prompt?: string } | undefined)?.prompt ||
      project.prompts?.publish ||
      DEFAULT_PUBLISH_PROMPT;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key not found');

    const agent = new PublishAgent(apiKey, project.agent_configs.publish || {
      provider: 'gemini',
      model: 'gemini-3-pro-preview',
      temperature: 0.3
    });

    const chunkLabel = (chunk.metadata?.chunk_index ?? chunk.index ?? 0) + 1;
    store.updateTask(taskId, { progress: 0.1, message: `Reprocessing chunk ${chunkLabel}...` });
    store.updateChunk(projectId, chunkId, { status: 'processing' });

    try {
      const formattedText = await agent.process(chunk.text, prompt, (chunkProgress) => {
        store.updateTask(taskId, {
          progress: 0.1 + chunkProgress * 0.8,
          message: `Reprocessing chunk ${chunkLabel}...`
        });
      });

      store.updateChunk(projectId, chunkId, {
        status: 'completed',
        translations: {
          ...chunk.translations,
          final: formattedText
        },
        error: undefined
      });

      store.updateTask(taskId, {
        progress: 1.0,
        message: `Chunk ${chunkLabel} reprocessed`
      });
    } catch (error) {
      console.error(`Publish chunk task failed for chunk ${chunkId}:`, error);
      store.updateChunk(projectId, chunkId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Publishing failed'
      });
      throw error;
    }
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

