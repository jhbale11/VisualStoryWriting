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
import { browserStorage } from '../services/BrowserStorage';

interface TranslationStore {
  // Projects
  projects: TranslationProject[];
  selectedProjectId?: string;

  // Archived projects (loaded from DB)
  archivedProjects: TranslationProject[];
  showArchived: boolean;

  // Tasks
  tasks: Record<string, Task>;

  // UI State
  view: 'main' | 'glossary' | 'translation' | 'review';
  selectedChunkId?: string;

  // Project actions
  createProject: (params: {
    name: string;
    type: 'translation' | 'glossary' | 'publish';
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
      publish?: string;
      review?: string;
    };
  }) => string;

  updateProject: (projectId: string, updates: Partial<TranslationProject>) => void;
  deleteProject: (projectId: string) => void;
  getProject: (projectId: string) => Promise<TranslationProject | undefined>;
  selectProject: (projectId: string) => void;

  // Archive management
  archiveCompletedProjects: () => Promise<void>;
  loadArchivedProjects: () => Promise<void>;
  toggleShowArchived: () => void;
  restoreProject: (projectId: string) => Promise<void>;

  // Export/Import
  exportProject: (projectId: string) => Promise<void>;
  importProject: (jsonContent: string) => Promise<void>;

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

      // Start new chunk with overlap (if specified)
      if (overlap > 0) {
        const overlapLines = Math.floor(overlap / 100);
        if (overlapLines > 0) {
          currentChunk = lines.slice(Math.max(0, i - overlapLines), i + 1).join('\n');
        } else {
          currentChunk = line;
        }
      } else {
        // No overlap - start fresh with current line
        currentChunk = line;
      }
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

// Check if project is completed
const isProjectCompleted = (project: TranslationProject): boolean => {
  const completedStatuses = ['glossary_completed', 'translation_completed', 'review_completed'];
  return completedStatuses.includes(project.status);
};

const LOCAL_CHUNK_WINDOW_RADIUS = 1; // keep current chunk ±1 in localStorage
const MAX_WINDOW_CHUNKS = LOCAL_CHUNK_WINDOW_RADIUS * 2 + 1;

const trimTranslationsForPersist = (translations: any, keepFull: boolean) => {
  if (!keepFull || !translations) return {};
  const { translated, enhanced, proofread, final, paragraphMatches, qualityScore } = translations;
  return { translated, enhanced, proofread, final, paragraphMatches, qualityScore };
};

const chooseWindowCenter = (project: TranslationProject, selectedChunkId?: string): number => {
  if (selectedChunkId) {
    const hit = project.chunks.find(c => c.id === selectedChunkId);
    if (hit) return hit.index;
  }
  const processing = project.chunks.find(c => c.status === 'processing');
  if (processing) return processing.index;
  const pending = project.chunks.find(c => c.status === 'pending');
  if (pending) return pending.index;
  return Math.max(0, project.chunks.findIndex(c => c.status === 'completed'));
};

const buildPersistedChunks = (project: TranslationProject, selectedChunkId?: string): Chunk[] => {
  const center = chooseWindowCenter(project, selectedChunkId);
  const windowIndices = new Set<number>();
  for (let offset = -LOCAL_CHUNK_WINDOW_RADIUS; offset <= LOCAL_CHUNK_WINDOW_RADIUS; offset++) {
    const idx = center + offset;
    if (idx >= 0 && idx < project.chunks.length) {
      windowIndices.add(idx);
    }
  }

  let kept = 0;
  return project.chunks.map(chunk => {
    const inWindow = windowIndices.has(chunk.index) && kept < MAX_WINDOW_CHUNKS;
    if (inWindow) kept++;
    return {
      ...chunk,
      // Keep only minimal data for non-window chunks to avoid quota issues
      text: inWindow ? chunk.text : '',
      translations: trimTranslationsForPersist(chunk.translations, inWindow),
      draft_final: inWindow ? chunk.draft_final : undefined,
      error: inWindow ? chunk.error : undefined,
    };
  });
};

const stripProjectForPersist = (project: TranslationProject, selectedChunkId?: string): TranslationProject => {
  return {
    ...project,
    // Strip large fields to shrink localStorage usage
    file_content: '',
    chunks: buildPersistedChunks(project, selectedChunkId),
  };
};

const hasFullChunkSet = (project?: TranslationProject): boolean => {
  if (!project || !project.chunks || project.chunks.length === 0) return false;
  const declaredTotal = project.chunks[0]?.metadata?.total_chunks;
  if (declaredTotal && project.chunks.length < declaredTotal) return false;
  return true;
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
      archivedProjects: [],
      showArchived: false,
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
            console.log('[TranslationStore] Parsed glossary for new project:', {
              hasCharacters: !!(glossary as any)?.characters,
              hasTerms: !!(glossary as any)?.terms,
              hasArcs: !!(glossary as any)?.arcs,
            });
          } catch (error) {
            console.log('[TranslationStore] Failed to parse glossary JSON, treating as raw text glossary');
            glossary = params.glossaryJson;
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

        // Save new project to IndexedDB immediately
        browserStorage.saveProject(project).catch(err => {
          console.error('[TranslationStore] Failed to save new project to IndexedDB:', err);
        });

        console.log('[TranslationStore] Created new project:', {
          id: projectId,
          hasGlossary: !!glossary,
          status: project.status,
        });

        return projectId;
      },

      updateProject: (projectId, updates) => {
        set(state => {
          // Update in active projects
          const projects = state.projects.map(p =>
            p.id === projectId
              ? { ...p, ...updates, updated_at: new Date().toISOString() }
              : p
          );

          // Also update in archived projects
          const archivedProjects = state.archivedProjects.map(p =>
            p.id === projectId
              ? { ...p, ...updates, updated_at: new Date().toISOString() }
              : p
          );

          return { projects, archivedProjects };
        });

        // Get updated project from either active or archived
        const state = get();
        const updatedProject = state.projects.find(p => p.id === projectId) ||
          state.archivedProjects.find(p => p.id === projectId);
        if (!updatedProject) return;

        // Save to IndexedDB
        browserStorage.saveProject(updatedProject).catch(err => {
          console.error('[TranslationStore] Failed to save project to IndexedDB:', err);
        });

        // Auto-archive if project becomes completed
        if (isProjectCompleted(updatedProject)) {
          console.log(`[TranslationStore] Auto-archiving completed project ${projectId}`);
          browserStorage.archiveProject(updatedProject).catch(err => {
            console.error('[TranslationStore] Failed to auto-archive project:', err);
          });
        }
      },

      deleteProject: (projectId) => {
        console.log(`[TranslationStore] Deleting project ${projectId}`);

        // Remove from state (this will automatically update LocalStorage via persist)
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          archivedProjects: state.archivedProjects.filter(p => p.id !== projectId),
          selectedProjectId: state.selectedProjectId === projectId ? undefined : state.selectedProjectId,
        }));

        // Delete from IndexedDB
        browserStorage.deleteProject(projectId)
          .then(() => {
            console.log(`[TranslationStore] Successfully deleted project ${projectId} from IndexedDB`);
          })
          .catch(err => {
            console.error('[TranslationStore] Failed to delete project from IndexedDB:', err);
          });

        // Explicitly update LocalStorage to ensure persistence
        // The persist middleware should handle this automatically, but we double-check
        try {
          const storageName = 'translation-storage';
          const stored = localStorage.getItem(storageName);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state) {
              // Remove project from localStorage state
              if (parsed.state.projects) {
                parsed.state.projects = parsed.state.projects.filter((p: any) => p.id !== projectId);
              }
              if (parsed.state.archivedProjects) {
                parsed.state.archivedProjects = parsed.state.archivedProjects.filter((p: any) => p.id !== projectId);
              }
              localStorage.setItem(storageName, JSON.stringify(parsed));
              console.log(`[TranslationStore] Successfully deleted project ${projectId} from LocalStorage`);
            }
          }
        } catch (error) {
          console.error('[TranslationStore] Failed to update LocalStorage:', error);
        }
      },

      getProject: async (projectId) => {
        // Prefer hydrated projects in memory
        const state = get();
        const activeProject = state.projects.find(p => p.id === projectId);
        if (activeProject && hasFullChunkSet(activeProject)) {
          return activeProject;
        }

        const archivedProject = state.archivedProjects.find(p => p.id === projectId);
        if (archivedProject && hasFullChunkSet(archivedProject)) {
          return archivedProject;
        }

        // Fetch full copy from IndexedDB if local copy is trimmed or missing
        try {
          const dbProject = await browserStorage.getProject(projectId);
          if (dbProject) {
            set(s => {
              const updateList = (list: TranslationProject[]) =>
                list.some(p => p.id === projectId)
                  ? list.map(p => (p.id === projectId ? dbProject : p))
                  : list;

              const inActive = s.projects.some(p => p.id === projectId);
              const inArchived = s.archivedProjects.some(p => p.id === projectId);

              if (inActive) {
                return { projects: updateList(s.projects) };
              }
              if (inArchived) {
                return { archivedProjects: updateList(s.archivedProjects) };
              }
              return { archivedProjects: [...s.archivedProjects, dbProject] };
            });
            return dbProject;
          }
        } catch (error) {
          console.error('[TranslationStore] Failed to get project from IndexedDB:', error);
        }

        // Return trimmed copy as a last resort
        return activeProject || archivedProject || undefined;
      },

      selectProject: (projectId) => {
        set({ selectedProjectId: projectId });
      },

      // Archive completed projects to DB
      archiveCompletedProjects: async () => {
        const state = get();
        const completedProjects = state.projects.filter(isProjectCompleted);

        if (completedProjects.length === 0) {
          console.log('[TranslationStore] No completed projects to archive');
          return;
        }

        console.log(`[TranslationStore] Archiving ${completedProjects.length} completed projects`);

        for (const project of completedProjects) {
          try {
            await browserStorage.archiveProject(project);
          } catch (error) {
            console.error(`[TranslationStore] Failed to archive project ${project.id}:`, error);
          }
        }

        // Remove archived projects from active list
        set(state => ({
          projects: state.projects.filter(p => !isProjectCompleted(p)),
        }));

        // Reload archived projects
        await get().loadArchivedProjects();
      },

      // Load archived projects from IndexedDB
      loadArchivedProjects: async () => {
        try {
          const archived = await browserStorage.listArchivedProjects({ limit: 100 });
          set({ archivedProjects: archived });
          console.log(`[TranslationStore] Loaded ${archived.length} archived projects`);
        } catch (error) {
          console.error('[TranslationStore] Failed to load archived projects:', error);
        }
      },

      // Toggle showing archived projects
      toggleShowArchived: () => {
        const state = get();
        const newShowArchived = !state.showArchived;
        set({ showArchived: newShowArchived });

        // Load archived projects if showing for the first time
        if (newShowArchived && state.archivedProjects.length === 0) {
          get().loadArchivedProjects();
        }
      },

      // Restore archived project to active
      restoreProject: async (projectId) => {
        try {
          const project = await browserStorage.getProject(projectId);
          if (!project) {
            console.error(`[TranslationStore] Project ${projectId} not found in IndexedDB`);
            return;
          }

          // Add to active projects
          set(state => ({
            projects: [...state.projects, project],
            archivedProjects: state.archivedProjects.filter(p => p.id !== projectId),
          }));

          // Save to IndexedDB as non-archived
          await browserStorage.saveProject(project);

          console.log(`[TranslationStore] Restored project ${projectId}`);
        } catch (error) {
          console.error('[TranslationStore] Failed to restore project:', error);
        }
      },

      // Export project to JSON (downloads file in browser)
      exportProject: async (projectId) => {
        try {
          const project = get().projects.find(p => p.id === projectId) ||
            get().archivedProjects.find(p => p.id === projectId);

          if (!project) {
            const dbProject = await browserStorage.getProject(projectId);
            if (dbProject) {
              await browserStorage.exportProjectToJson(dbProject);
            } else {
              throw new Error(`Project ${projectId} not found`);
            }
          } else {
            await browserStorage.exportProjectToJson(project);
          }

          console.log(`[TranslationStore] Exported project ${projectId}`);
        } catch (error) {
          console.error('[TranslationStore] Failed to export project:', error);
          throw error;
        }
      },

      // Import project from JSON (accepts file content)
      importProject: async (jsonContent) => {
        try {
          const project = await browserStorage.importProjectFromJson(jsonContent);
          set(state => ({
            projects: [...state.projects, project],
          }));
          console.log(`[TranslationStore] Imported project ${project.id}`);
        } catch (error) {
          console.error('[TranslationStore] Failed to import project:', error);
          throw error;
        }
      },

      setGlossary: (projectId, glossary) => {
        set(state => {
          // Update in active projects
          const projects = state.projects.map(p =>
            p.id === projectId
              ? { ...p, glossary, status: 'glossary_completed', updated_at: new Date().toISOString() }
              : p
          );

          // Also update in archived projects
          const archivedProjects = state.archivedProjects.map(p =>
            p.id === projectId
              ? { ...p, glossary, status: 'glossary_completed', updated_at: new Date().toISOString() }
              : p
          );

          return { projects, archivedProjects };
        });

        // Save updated project to IndexedDB
        const state = get();
        const updatedProject = state.projects.find(p => p.id === projectId) ||
          state.archivedProjects.find(p => p.id === projectId);
        if (updatedProject) {
          browserStorage.saveProject(updatedProject).catch(err => {
            console.error('[TranslationStore] Failed to save glossary to IndexedDB:', err);
          });
        }
      },

      updateChunk: (projectId, chunkId, updates) => {
        set(state => {
          // Helper function to update chunks
          const updateProjectChunks = (p: TranslationProject) =>
            p.id === projectId
              ? {
                ...p,
                chunks: p.chunks.map(c =>
                  c.id === chunkId ? { ...c, ...updates } : c
                ),
                updated_at: new Date().toISOString(),
              }
              : p;

          // Update in both active and archived projects
          return {
            projects: state.projects.map(updateProjectChunks),
            archivedProjects: state.archivedProjects.map(updateProjectChunks),
          };
        });

        // Save updated project to IndexedDB (debounced to avoid too many writes)
        const state = get();
        const updatedProject = state.projects.find(p => p.id === projectId) ||
          state.archivedProjects.find(p => p.id === projectId);
        if (updatedProject) {
          browserStorage.saveProject(updatedProject).catch(err => {
            console.error('[TranslationStore] Failed to save chunk update to IndexedDB:', err);
          });
        }
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
        // Only store active (non-completed) projects to prevent storage quota issues
        projects: state.projects
          .filter(p => !isProjectCompleted(p))
          .map(p => stripProjectForPersist(p, state.selectedChunkId)),
        selectedProjectId: state.selectedProjectId,
        selectedChunkId: state.selectedChunkId,
        view: state.view,
        showArchived: state.showArchived,
        // Don't persist tasks - they are runtime state and can contain large metadata
        // Don't persist archivedProjects - they are loaded from DB on demand
      }),
      onRehydrateStorage: () => async (state) => {
        if (state) {
          console.log('[TranslationStore] Rehydrated with', state.projects.length, 'active projects from localStorage');

          // Load all active (non-archived) projects from IndexedDB
          try {
            // First, check all projects in IndexedDB (for debugging)
            const allDbProjects = await browserStorage.listProjects({ includeArchived: true });
            console.log('[TranslationStore] Total projects in IndexedDB:', allDbProjects.length);
            if (allDbProjects.length > 0) {
              console.log('[TranslationStore] Projects in DB:', allDbProjects.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
              })));
            }

            // Load only active projects
            const dbProjects = await browserStorage.listProjects({ includeArchived: false });
            console.log('[TranslationStore] Loaded', dbProjects.length, 'active projects from IndexedDB');

            // Merge with localStorage projects, but prefer DB versions to keep full chunk data
            const merged = new Map<string, TranslationProject>();
            state.projects.forEach(p => merged.set(p.id, p));
            dbProjects.forEach(p => merged.set(p.id, p)); // DB overwrites window-trimmed copies

            state.projects = Array.from(merged.values());

            // Ensure selected project exists after merge
            if (state.selectedProjectId && !merged.has(state.selectedProjectId)) {
              state.selectedProjectId = undefined;
            }
          } catch (error) {
            console.error('[TranslationStore] Failed to load projects from IndexedDB:', error);
          }

          // Auto-archive any completed projects that were in localStorage
          const completedProjects = state.projects.filter(isProjectCompleted);
          if (completedProjects.length > 0) {
            console.log('[TranslationStore] Found', completedProjects.length, 'completed projects to archive');
            state.archiveCompletedProjects();
          }
        }
      },
    }
  )
);

