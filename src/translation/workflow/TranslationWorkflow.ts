import { createWorkflow, START, END } from './SimpleWorkflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TranslationAgent } from '../agents/TranslationAgent';
import { EnhancementAgent } from '../agents/EnhancementAgent';
import { QualityAgent } from '../agents/QualityAgent';
import { ProofreaderAgent } from '../agents/ProofreaderAgent';
import { LayoutAgent } from '../agents/LayoutAgent';
import { ParagraphMatchingAgent } from '../agents/ParagraphMatchingAgent';
import { ReviewAgent } from '../agents/ReviewAgent';
import type { TranslationState, Glossary, AgentConfigs } from '../types';
import { LLMClientFactory } from '../llm/clients';

export interface TranslationWorkflowConfig {
  agentConfigs: AgentConfigs;
  glossary?: Glossary;
  maxRetries?: number;
  enableProofreader?: boolean;
  targetLanguage?: 'en' | 'ja';
  customPrompts?: Record<string, string>;
}

export class TranslationWorkflow {
  private clients: Record<string, BaseChatModel> = {};
  private translationAgent?: TranslationAgent;
  private enhancementAgent?: EnhancementAgent;
  private qualityAgent?: QualityAgent;
  private proofreaderAgent?: ProofreaderAgent;
  private layoutAgent?: LayoutAgent;
  private matchingAgent?: ParagraphMatchingAgent;
  private reviewAgent?: ReviewAgent;
  private config: TranslationWorkflowConfig;

  constructor(config: TranslationWorkflowConfig) {
    this.config = config;
    this.initializeAgents();
  }

  /** Lightweight retry helper for non-critical steps (matching / review) */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempts: number = 2,
    delayMs: number = 250
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (i + 1 < attempts && delayMs > 0) {
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    }
    throw lastError;
  }

  private initializeAgents() {
    // Default targetLanguage를 영어로 설정해 리뷰 단계가 기본적으로 활성화되도록 수정
    const { agentConfigs, glossary, targetLanguage = 'en', customPrompts = {} } = this.config;

    // Create LLM clients
    const configMap: Record<string, any> = {};
    if (agentConfigs.translation) configMap.translation = agentConfigs.translation;
    if (agentConfigs.enhancement) configMap.enhancement = agentConfigs.enhancement;
    if (agentConfigs.quality) configMap.quality = agentConfigs.quality;
    if (agentConfigs.proofreader) configMap.proofreader = agentConfigs.proofreader;
    if (agentConfigs.layout) configMap.layout = agentConfigs.layout;
    if (agentConfigs.review) configMap.review = agentConfigs.review;

    this.clients = LLMClientFactory.createClients(configMap);

    // Initialize agents
    if (this.clients.translation) {
      this.translationAgent = new TranslationAgent(
        this.clients.translation,
        glossary,
        targetLanguage,
        customPrompts.translation
      );
    }

    if (this.clients.enhancement) {
      this.enhancementAgent = new EnhancementAgent(
        this.clients.enhancement,
        glossary,
        targetLanguage,
        customPrompts.enhancement
      );
    }

    if (this.clients.quality) {
      this.qualityAgent = new QualityAgent(
        this.clients.quality,
        targetLanguage,
        customPrompts.quality
      );
    }

    if (this.clients.proofreader) {
      this.proofreaderAgent = new ProofreaderAgent(
        this.clients.proofreader,
        targetLanguage,
        customPrompts.proofreader
      );
    }

    if (this.clients.layout) {
      this.layoutAgent = new LayoutAgent(
        this.clients.layout,
        targetLanguage,
        customPrompts.layout
      );
    }

    if (this.clients.review) {
      this.reviewAgent = new ReviewAgent(
        this.clients.review,
        customPrompts.review
      );
    }

    // Initialize matching agent (always available)
    try {
      this.matchingAgent = new ParagraphMatchingAgent();
    } catch (error) {
      console.warn('ParagraphMatchingAgent initialization failed:', error);
      // Continue without matching agent if initialization fails
    }
  }

  private createGraph() {
    const workflow = createWorkflow<TranslationState>();

    // Add nodes
    workflow.addNode('translate', this.translateNode.bind(this));
    workflow.addNode('enhance', this.enhanceNode.bind(this));
    workflow.addNode('quality_check', this.qualityCheckNode.bind(this));
    workflow.addNode('proofread', this.proofreadNode.bind(this));
    workflow.addNode('layout', this.layoutNode.bind(this));
    workflow.addNode('matching', this.matchingNode.bind(this));
    workflow.addNode('review', this.reviewNode.bind(this));
    workflow.addNode('post_process', this.postProcessNode.bind(this));

    // Add edges
    workflow.addEdge(START, 'translate');
    workflow.addEdge('translate', 'enhance');
    workflow.addEdge('enhance', 'quality_check');

    // Quality is the gatekeeper:
    // - If quality is poor (<70) and retries remain -> enhance again (with feedback)
    // - If quality is great (>=90) -> skip proofread and go to layout
    // - Otherwise -> proofread -> layout
    workflow.addConditionalEdges(
      'quality_check',
      this.afterQualityCheckV3.bind(this),
      {
        enhance: 'enhance',
        proofread: 'proofread',
        layout: 'layout',
      }
    );

    workflow.addEdge('proofread', 'layout');

    // Post-processing: run matching + review concurrently (engine is sequential, so we parallelize inside a node)
    workflow.addEdge('layout', 'post_process');
    workflow.addEdge('post_process', END);

    return workflow.compile();
  }

  private async translateNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.translationAgent) {
      return { error: 'Translation agent not initialized', currentStage: 'translate' };
    }

    try {
      const translated = await this.translationAgent.translate(
        state.sourceText,
        state.chunkMetadata,
        state.previousContext
      );

      return {
        translated,
        currentStage: 'translate',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Translation failed',
        currentStage: 'translate',
      };
    }
  }

  private async enhanceNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.enhancementAgent) {
      // Skip enhancement if not configured
      return {
        enhanced: state.translated,
        currentStage: 'enhance',
      };
    }

    try {
      const isRetry = (state.retryCount || 0) > 0;
      const hasFeedback = !!(state.qualityIssues && state.qualityIssues.length > 0);
      const inputText = state.enhanced || state.translated || '';

      const enhanced = isRetry && hasFeedback
        ? await this.enhancementAgent.enhance(inputText, state.sourceText, state.qualityIssues)
        : await this.enhancementAgent.enhance(state.translated || '', state.sourceText);

      return {
        enhanced,
        needsReenhancement: false,
        currentStage: 'enhance',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Enhancement failed',
        enhanced: state.translated,
        currentStage: 'enhance',
      };
    }
  }

  private async qualityCheckNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.qualityAgent) {
      return {
        qualityScore: 100,
        qualityIssues: [],
        needsReenhancement: false,
        currentStage: 'quality_check',
      };
    }

    try {
      const result = await this.qualityAgent.checkQuality(
        state.enhanced || '',
        state.sourceText
      );

      const retryCount = (state.retryCount || 0);
      const maxRetries = state.maxRetries || 2;
      const score = result.overall_score;
      const needsRetry = score < 70 && retryCount < maxRetries && result.major_issues.length > 0;

      return {
        qualityScore: score,
        qualityIssues: [...result.major_issues, ...result.minor_issues],
        needsReenhancement: needsRetry,
        retryCount: needsRetry ? retryCount + 1 : retryCount,
        currentStage: 'quality_check',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Quality check failed',
        qualityScore: 70,
        qualityIssues: [],
        needsReenhancement: false,
        currentStage: 'quality_check',
      };
    }
  }

  private async proofreadNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.proofreaderAgent || !state.enableProofreader) {
      // Skip proofreading if not configured or disabled
      return {
        proofread: state.enhanced,
        currentStage: 'proofread',
      };
    }

    try {
      const proofread = await this.proofreaderAgent.proofread(
        state.enhanced || '',
        state.sourceText
      );

      return {
        proofread,
        currentStage: 'proofread',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Proofreading failed',
        proofread: state.enhanced,
        currentStage: 'proofread',
      };
    }
  }

  private async layoutNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.layoutAgent) {
      // Skip layout if not configured
      const text = state.proofread || state.enhanced || state.translated || '';
      return {
        final: text,
        currentStage: 'layout',
      };
    }

    try {
      const final = await this.layoutAgent.format(
        state.proofread || state.enhanced || state.translated || ''
      );

      return {
        final,
        currentStage: 'layout',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Layout failed',
        final: state.proofread || state.enhanced || state.translated || '',
        currentStage: 'layout',
      };
    }
  }

  // Conditional routing functions (v2: enhance -> proofread -> quality -> layout)
  private afterQualityCheckV3(state: TranslationState): string {
    if (state.needsReenhancement && this.enhancementAgent && !state.error) {
      return 'enhance';
    }

    const score = state.qualityScore ?? 0;
    if (score >= 90 || !state.enableProofreader || !this.proofreaderAgent) {
      return 'layout';
    }

    return 'proofread';
  }

  private async postProcessNode(state: TranslationState): Promise<Partial<TranslationState>> {
    // Run matching & review concurrently; both are non-critical.
    const tasks: Array<Promise<Partial<TranslationState>>> = [
      this.matchingNode(state),
      this.reviewNode(state),
    ];

    const settled = await Promise.allSettled(tasks);

    const updates: Partial<TranslationState> = {
      currentStage: 'post_process',
    };

    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      const { currentStage: _ignoredStage, ...rest } = r.value as any;
      Object.assign(updates, rest);
    }

    return updates;
  }

  private async matchingNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.matchingAgent) {
      // Skip matching if not configured
      console.log('Matching agent not initialized, skipping paragraph matching');
      return {
        currentStage: 'matching',
      };
    }

    const matchingAgent = this.matchingAgent!;
    const runMatch = async () => {
      const finalText = state.final || state.proofread || state.enhanced || state.translated || '';
      const koreanText = state.sourceText;

      if (!finalText || !koreanText) {
        console.warn('Missing text for paragraph matching, skipping');
        return {
          currentStage: 'matching',
        };
      }

      console.log('Starting paragraph matching...');
      const matchResult = await matchingAgent.matchParagraphs(
        koreanText,
        finalText
      );

      console.log('Paragraph matching completed successfully');
      return {
        paragraphMatches: matchResult,
        currentStage: 'matching',
      };
    };

    try {
      return await this.withRetry(runMatch, 2, 300);
    } catch (error) {
      console.error('Paragraph matching failed after retry (non-critical):', error);
      return {
        currentStage: 'matching',
      };
    }
  }

  private async reviewNode(state: TranslationState): Promise<Partial<TranslationState>> {
    // Only run automated review for English targets
    if (this.config.targetLanguage !== 'en') {
      return { currentStage: 'review' };
    }

    if (!this.reviewAgent) {
      // Skip review if not configured
      return { currentStage: 'review' };
    }

    const runReview = async () => {
      const reviewAgent = this.reviewAgent!;
      const finalText = state.final || state.proofread || state.enhanced || state.translated || '';
      const koreanText = state.sourceText;
      if (!finalText || !koreanText) {
        return { currentStage: 'review' };
      }

      const issues = await reviewAgent.review(koreanText, finalText);
      return {
        reviewIssues: issues,
        currentStage: 'review',
        llmCalls: (state.llmCalls || 0) + 1,
      };
    };

    try {
      return await this.withRetry(runReview, 2, 300);
    } catch (error) {
      console.error('Review step failed after retry (non-critical):', error);
      return { currentStage: 'review' };
    }
  }

  async processChunk(
    sourceText: string,
    chunkMetadata: any,
    previousContext?: string
  ): Promise<TranslationState> {
    const graph = this.createGraph();

    const initialState: TranslationState = {
      sourceText,
      previousContext,
      glossary: this.config.glossary,
      chunkMetadata,
      customPrompts: this.config.customPrompts,
      retryCount: 0,
      maxRetries: this.config.maxRetries || 2,
      enableProofreader: this.config.enableProofreader !== false,
      llmCalls: 0,
    };

    const result = await graph.invoke(initialState);
    return result as TranslationState;
  }
}

