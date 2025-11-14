import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TranslationProject,
  Task,
  TaskType,
  TaskStatus,
  Glossary,
  Chunk,
  AgentConfigs,
} from '../types';

interface TranslationStore {
  // Projects
  projects: TranslationProject[];
  selectedProjectId?: string;
  
  // Tasks
  tasks: Record<string, Task>;
  
  // UI State
  view: 'main' | 'glossary' | 'translation' | 'review';
  selectedChunkId?: string;
  
  // Project actions
  createProject: (params: {
    name: string;
    type: 'translation' | 'glossary';
    fileContent: string;
    chunkSize: number;
    overlap: number;
    maxRetries: number;
    enableProofreader: boolean;
    agentConfigs: AgentConfigs;
    language: 'en' | 'ja';
    glossaryJson?: string;
    customPrompts?: {
      translation?: string;
      enhancement?: string;
      proofreader?: string;
      layout?: string;
    };
  }) => string;
  
  updateProject: (projectId: string, updates: Partial<TranslationProject>) => void;
  deleteProject: (projectId: string) => void;
  getProject: (projectId: string) => TranslationProject | undefined;
  selectProject: (projectId: string) => void;
  
  // Glossary actions
  setGlossary: (projectId: string, glossary: Glossary) => void;
  
  // Chunk actions
  updateChunk: (projectId: string, chunkId: string, updates: Partial<Chunk>) => void;
  selectChunk: (chunkId: string) => void;
  
  // Task actions
  createTask: (params: {
    type: TaskType;
    projectId: string;
    chunkId?: string;
    metadata?: any;
  }) => string;
  
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  getTask: (taskId: string) => Task | undefined;
  cancelTask: (taskId: string) => void;
  
  // View actions
  setView: (view: 'main' | 'glossary' | 'translation' | 'review') => void;
}

const generateId = (prefix: string) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

const createChunks = (text: string, chunkSize: number, overlap: number): Chunk[] => {
  const chunks: Chunk[] = [];
  const lines = text.split('\n');
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
      // Create chunk
      chunks.push({
        id: `chunk_${chunkIndex}`,
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          chunk_index: chunkIndex,
          total_chunks: 0, // Will be updated later
        },
        status: 'pending',
        translations: {},
      });
      
      // Start new chunk with overlap
      const overlapLines = Math.floor(overlap / 100);
      currentChunk = lines.slice(Math.max(0, i - overlapLines), i + 1).join('\n');
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  // Add last chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: `chunk_${chunkIndex}`,
      text: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        chunk_index: chunkIndex,
        total_chunks: 0,
      },
      status: 'pending',
      translations: {},
    });
  }
  
  // Update total_chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.metadata.total_chunks = totalChunks;
  });
  
  return chunks;
};

// Helper function to clean up old storage if it's too large
const cleanupLegacyStorage = () => {
  try {
    const storageName = 'translation-storage';
    const stored = localStorage.getItem(storageName);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Remove tasks from old storage format
      if (parsed.state?.tasks) {
        delete parsed.state.tasks;
        localStorage.setItem(storageName, JSON.stringify(parsed));
        console.log('Cleaned up legacy tasks from storage');
      }
    }
  } catch (error) {
    console.error('Failed to cleanup legacy storage:', error);
  }
};

// Run cleanup on module load
if (typeof window !== 'undefined') {
  cleanupLegacyStorage();
}

export const useTranslationStore = create<TranslationStore>()(
  persist(
    (set, get) => ({
      projects: [],
      tasks: {},
      view: 'main',
      
      createProject: (params) => {
        const projectId = generateId('proj');
        const chunks = createChunks(params.fileContent, params.chunkSize, params.overlap);
        
        // Parse glossary JSON if provided
        let glossary: Glossary | undefined;
        if (params.glossaryJson) {
          try {
            glossary = JSON.parse(params.glossaryJson);
          } catch (error) {
            console.error('Failed to parse glossary JSON:', error);
          }
        }
        
        const project: TranslationProject = {
          id: projectId,
          name: params.name,
          type: params.type,
          status: glossary ? 'glossary_completed' : 'setup',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          file_content: params.fileContent,
          chunks,
          chunk_size: params.chunkSize,
          overlap: params.overlap,
          translation_progress: 0,
          max_retries: params.maxRetries,
          enable_proofreader: params.enableProofreader,
          language: params.language,
          agent_configs: params.agentConfigs,
          glossary,
          prompts: params.customPrompts,
        };
        
        set(state => ({
          projects: [...state.projects, project],
          selectedProjectId: projectId,
        }));
        
        return projectId;
      },
      
      updateProject: (projectId, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, ...updates, updated_at: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      deleteProject: (projectId) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          selectedProjectId: state.selectedProjectId === projectId ? undefined : state.selectedProjectId,
        }));
      },
      
      getProject: (projectId) => {
        return get().projects.find(p => p.id === projectId);
      },
      
      selectProject: (projectId) => {
        set({ selectedProjectId: projectId });
      },
      
      setGlossary: (projectId, glossary) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, glossary, status: 'glossary_completed', updated_at: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      updateChunk: (projectId, chunkId, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  chunks: p.chunks.map(c =>
                    c.id === chunkId ? { ...c, ...updates } : c
                  ),
                  updated_at: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      selectChunk: (chunkId) => {
        set({ selectedChunkId: chunkId });
      },
      
      createTask: (params) => {
        const taskId = generateId('task');
        const task: Task = {
          id: taskId,
          type: params.type,
          status: 'pending',
          progress: 0,
          message: 'Initializing...',
          projectId: params.projectId,
          chunkId: params.chunkId,
          metadata: params.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set(state => ({
          tasks: { ...state.tasks, [taskId]: task },
        }));
        
        return taskId;
      },
      
      updateTask: (taskId, updates) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId]
              ? {
                  ...state.tasks[taskId],
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : state.tasks[taskId],
          },
        }));
      },
      
      getTask: (taskId) => {
        return get().tasks[taskId];
      },
      
      cancelTask: (taskId) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId]
              ? {
                  ...state.tasks[taskId],
                  status: 'cancelled',
                  updatedAt: new Date().toISOString(),
                }
              : state.tasks[taskId],
          },
        }));
      },
      
      setView: (view) => {
        set({ view });
      },
    }),
    {
      name: 'translation-storage',
      partialize: (state) => ({
        // Limit to last 10 projects to prevent storage quota issues
        projects: state.projects.slice(-10),
        selectedProjectId: state.selectedProjectId,
        view: state.view,
        // Don't persist tasks - they are runtime state and can contain large metadata
        // tasks: state.tasks,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Translation store rehydrated with', state.projects.length, 'projects');
        }
      },
    }
  )
);

