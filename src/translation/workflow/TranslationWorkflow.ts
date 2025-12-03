import { createWorkflow, START, END } from './SimpleWorkflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TranslationAgent } from '../agents/TranslationAgent';
import { EnhancementAgent } from '../agents/EnhancementAgent';
import { QualityAgent } from '../agents/QualityAgent';
import { ProofreaderAgent } from '../agents/ProofreaderAgent';
import { LayoutAgent } from '../agents/LayoutAgent';
import { ParagraphMatchingAgent } from '../agents/ParagraphMatchingAgent';
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
  private config: TranslationWorkflowConfig;

  constructor(config: TranslationWorkflowConfig) {
    this.config = config;
    this.initializeAgents();
  }

  private initializeAgents() {
    const { agentConfigs, glossary, targetLanguage = 'ja', customPrompts = {} } = this.config;

    // Create LLM clients
    const configMap: Record<string, any> = {};
    if (agentConfigs.translation) configMap.translation = agentConfigs.translation;
    if (agentConfigs.enhancement) configMap.enhancement = agentConfigs.enhancement;
    if (agentConfigs.quality) configMap.quality = agentConfigs.quality;
    if (agentConfigs.proofreader) configMap.proofreader = agentConfigs.proofreader;
    if (agentConfigs.layout) configMap.layout = agentConfigs.layout;

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

    // Initialize matching agent (always available)
    try {
      this.matchingAgent = new ParagraphMatchingAgent();
    } catch (error) {
      console.warn('ParagraphMatchingAgent initialization failed:', error);
      // Continue without matching agent if initialization fails
    }
  }

  createGraph() {
    const workflow = createWorkflow<TranslationState>();

    // Add nodes
    workflow.addNode('translate', this.translateNode.bind(this));
    workflow.addNode('enhance', this.enhanceNode.bind(this));
    workflow.addNode('quality_check', this.qualityCheckNode.bind(this));
    workflow.addNode('proofread', this.proofreadNode.bind(this));
    workflow.addNode('layout', this.layoutNode.bind(this));
    workflow.addNode('matching', this.matchingNode.bind(this));

    // Add edges
    workflow.addEdge(START, 'translate');
    workflow.addEdge('translate', 'enhance');

    // Conditional: quality check decides whether to re-enhance
    workflow.addConditionalEdges(
      'enhance',
      this.shouldRunQualityCheck.bind(this),
      {
        quality_check: 'quality_check',
        proofread: 'proofread',
        layout: 'layout',
      }
    );

    // After quality check, decide whether to re-enhance
    workflow.addConditionalEdges(
      'quality_check',
      this.afterQualityCheck.bind(this),
      {
        enhance: 'enhance',
        proofread: 'proofread',
        layout: 'layout',
      }
    );

    // Conditional: run proofreader if enabled
    workflow.addConditionalEdges(
      'proofread',
      this.shouldRunLayout.bind(this),
      {
        layout: 'layout',
        matching: 'matching',
      }
    );

    // After layout, always run matching
    workflow.addEdge('layout', 'matching');

    // Matching is the final step
    workflow.addEdge('matching', END);

    return workflow.compile();
  }

  private async translateNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.translationAgent) {
      return { error: 'Translation agent not initialized', currentStage: 'translate' };
    }

    try {
      const translated = await this.translationAgent.translate(
        state.sourceText,
        state.chunkMetadata
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
      const enhanced = await this.enhancementAgent.enhance(
        state.translated || '',
        state.sourceText
      );

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
      const needsRetry = !result.passes && retryCount < maxRetries && result.major_issues.length > 0;

      return {
        qualityScore: result.overall_score,
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

  // Conditional routing functions
  private shouldRunQualityCheck(state: TranslationState): string {
    if (this.qualityAgent && !state.error) {
      return 'quality_check';
    } else if (state.enableProofreader && this.proofreaderAgent) {
      return 'proofread';
    } else if (this.layoutAgent) {
      return 'layout';
    }
    return 'layout'; // Default to layout as final step
  }

  private afterQualityCheck(state: TranslationState): string {
    if (state.needsReenhancement && this.enhancementAgent) {
      return 'enhance';
    } else if (state.enableProofreader && this.proofreaderAgent) {
      return 'proofread';
    } else if (this.layoutAgent) {
      return 'layout';
    }
    return 'layout';
  }

  private shouldRunLayout(state: TranslationState): string {
    if (this.layoutAgent && !state.error) {
      return 'layout';
    }
    // Skip layout and go to matching
    return 'matching';
  }

  private async matchingNode(state: TranslationState): Promise<Partial<TranslationState>> {
    if (!this.matchingAgent) {
      // Skip matching if not configured
      console.log('Matching agent not initialized, skipping paragraph matching');
      return {
        currentStage: 'matching',
      };
    }

    try {
      const finalText = state.final || state.proofread || state.enhanced || state.translated || '';
      const koreanText = state.sourceText;

      if (!finalText || !koreanText) {
        console.warn('Missing text for paragraph matching, skipping');
        return {
          currentStage: 'matching',
        };
      }

      console.log('Starting paragraph matching...');
      const matchResult = await this.matchingAgent.matchParagraphs(
        koreanText,
        finalText
      );

      console.log('Paragraph matching completed successfully');
      return {
        paragraphMatches: matchResult,
        currentStage: 'matching',
      };
    } catch (error) {
      console.error('Paragraph matching failed (non-critical):', error);
      // Don't fail the entire workflow if matching fails - just skip it
      // Don't set state.error as it would cause the whole workflow to fail
      return {
        currentStage: 'matching',
        // paragraphMatches will be undefined, which is acceptable
      };
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

