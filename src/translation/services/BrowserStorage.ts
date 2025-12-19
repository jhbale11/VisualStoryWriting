/**
 * Browser-compatible storage service using IndexedDB
 * This replaces Prisma for client-side storage
 */

import type { TranslationProject } from '../types';

const DB_NAME = 'translation-db';
const PROJECT_STORE = 'projects';
const REVIEW_STORE = 'reviews';

interface ReviewRecord {
  key: string; // `${projectId}:${chunkId}`
  projectId: string;
  chunkId: string;
  issues: Array<Record<string, any>>;
  updated_at: string;
}

class BrowserStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    // Important: do NOT pass an explicit version here.
    // Passing a lower version than what's already on disk triggers VersionError (downgrade),
    // which blocks all reads/writes. Opening without version always opens the existing DB.
    const db = await this.openDb();
    this.db = db;

    // Ensure schema is present (auto-upgrade if needed).
    await this.ensureSchema();
  }

  private openDb(version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = typeof version === 'number'
        ? indexedDB.open(DB_NAME, version)
        : indexedDB.open(DB_NAME);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Projects store
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          const store = db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
          store.createIndex('is_archived', 'is_archived', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }
        // Reviews store (per-chunk review issues)
        if (!db.objectStoreNames.contains(REVIEW_STORE)) {
          const reviewStore = db.createObjectStore(REVIEW_STORE, { keyPath: 'key' });
          reviewStore.createIndex('projectId', 'projectId', { unique: false });
          reviewStore.createIndex('updated_at', 'updated_at', { unique: false });
        }
      };
    });
  }

  private async ensureSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const missingProjects = !this.db.objectStoreNames.contains(PROJECT_STORE);
    const missingReviews = !this.db.objectStoreNames.contains(REVIEW_STORE);
    if (!missingProjects && !missingReviews) return;

    // Upgrade by bumping the DB version by 1 (safe monotonic upgrade).
    const nextVersion = this.db.version + 1;
    this.db.close();
    this.db = await this.openDb(nextVersion);
  }

  private async getStore(store: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([store], mode);
    return transaction.objectStore(store);
  }

  // Check if project is completed
  private isCompleted(project: TranslationProject): boolean {
    const completedStatuses = ['glossary_completed', 'translation_completed', 'review_completed'];
    return completedStatuses.includes(project.status);
  }

  // Save project to IndexedDB
  async saveProject(project: TranslationProject): Promise<void> {
    try {
      const store = await this.getStore(PROJECT_STORE, 'readwrite');
      const isArchived = this.isCompleted(project);
      const projectWithArchive = {
        ...project,
        is_archived: isArchived,
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(projectWithArchive);
        request.onsuccess = () => {
          console.log(`[BrowserStorage] Saved project ${project.id} (${project.name}) - archived: ${isArchived}, status: ${project.status}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to save project:', error);
      throw error;
    }
  }

  // Archive completed project
  async archiveProject(project: TranslationProject): Promise<void> {
    try {
      const projectWithArchive = {
        ...project,
        is_archived: true,
      };
      await this.saveProject(projectWithArchive);
      console.log(`[BrowserStorage] Archived project ${project.id}`);
    } catch (error) {
      console.error('[BrowserStorage] Failed to archive project:', error);
      throw error;
    }
  }

  // Get project from IndexedDB
  async getProject(projectId: string): Promise<TranslationProject | null> {
    try {
      const store = await this.getStore(PROJECT_STORE, 'readonly');
      
      return new Promise((resolve, reject) => {
        const request = store.get(projectId);
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            // Remove is_archived field before returning
            const { is_archived, ...project } = result;
            resolve(project as TranslationProject);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to get project:', error);
      return null;
    }
  }

  // List all projects
  async listProjects(options?: {
    includeArchived?: boolean;
    type?: TranslationProject['type'];
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const store = await this.getStore(PROJECT_STORE, 'readonly');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          let projects = request.result || [];
          
          // Filter by archive status
          // Note: is_archived might be undefined for old projects, treat as false
          if (!options?.includeArchived) {
            projects = projects.filter(p => p.is_archived !== true);
          }
          
          // Filter by type
          if (options?.type) {
            projects = projects.filter(p => p.type === options.type);
          }
          
          // Sort by updated_at (newest first)
          projects.sort((a, b) => {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          
          // Apply offset and limit
          if (options?.offset !== undefined) {
            projects = projects.slice(options.offset);
          }
          if (options?.limit !== undefined) {
            projects = projects.slice(0, options.limit);
          }
          
          // Remove is_archived field
          const cleanProjects = projects.map(p => {
            const { is_archived, ...project } = p;
            return project as TranslationProject;
          });
          
          console.log(`[BrowserStorage] Listed ${cleanProjects.length} projects (includeArchived: ${options?.includeArchived})`);
          resolve(cleanProjects);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to list projects:', error);
      return [];
    }
  }

  // List archived projects
  async listArchivedProjects(options?: {
    type?: TranslationProject['type'];
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const store = await this.getStore(PROJECT_STORE, 'readonly');
      
      return new Promise((resolve, reject) => {
        // Get all projects and filter in memory
        const request = store.getAll();
        
        request.onsuccess = () => {
          // Filter for archived projects
          let projects = (request.result || []).filter(p => p.is_archived === true);
          
          // Filter by type
          if (options?.type) {
            projects = projects.filter(p => p.type === options.type);
          }
          
          // Sort by updated_at (newest first)
          projects.sort((a, b) => {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          
          // Apply offset and limit
          if (options?.offset !== undefined) {
            projects = projects.slice(options.offset);
          }
          if (options?.limit !== undefined) {
            projects = projects.slice(0, options.limit);
          }
          
          // Remove is_archived field
          const cleanProjects = projects.map(p => {
            const { is_archived, ...project } = p;
            return project as TranslationProject;
          });
          
          console.log(`[BrowserStorage] Listed ${cleanProjects.length} archived projects`);
          resolve(cleanProjects);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to list archived projects:', error);
      return [];
    }
  }

  // Delete project from IndexedDB
  async deleteProject(projectId: string): Promise<void> {
    try {
      // First, check if the project exists
      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        console.warn(`[BrowserStorage] Project ${projectId} not found in IndexedDB, skipping deletion`);
        return;
      }
      
      const store = await this.getStore(PROJECT_STORE, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(projectId);
        request.onsuccess = () => {
          console.log(`[BrowserStorage] Successfully deleted project ${projectId} from IndexedDB`);
          resolve();
        };
        request.onerror = () => {
          console.error(`[BrowserStorage] Error deleting project ${projectId}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to delete project:', error);
      throw error;
    }
  }

  // Export project to JSON (downloads file)
  async exportProjectToJson(project: TranslationProject, filename?: string): Promise<void> {
    try {
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFilename = `${project.name}_${timestamp}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`[BrowserStorage] Exported project ${project.id}`);
    } catch (error) {
      console.error('[BrowserStorage] Failed to export project:', error);
      throw error;
    }
  }

  // Import project from JSON
  async importProjectFromJson(jsonContent: string): Promise<TranslationProject> {
    try {
      const project: TranslationProject = JSON.parse(jsonContent);
      
      // Generate new ID if project already exists
      const existingProject = await this.getProject(project.id);
      if (existingProject) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        project.id = `proj_${timestamp}_${random}`;
        project.name = `${project.name} (imported)`;
      }
      
      await this.saveProject(project);
      console.log(`[BrowserStorage] Imported project ${project.id}`);
      
      return project;
    } catch (error) {
      console.error('[BrowserStorage] Failed to import project:', error);
      throw error;
    }
  }

  // Cleanup: Delete old archived projects (keep last N)
  async cleanupOldProjects(keepCount: number = 50): Promise<number> {
    try {
      const archivedProjects = await this.listArchivedProjects();
      
      if (archivedProjects.length <= keepCount) {
        return 0;
      }
      
      const projectsToDelete = archivedProjects.slice(keepCount);
      let deletedCount = 0;
      
      for (const project of projectsToDelete) {
        await this.deleteProject(project.id);
        deletedCount++;
      }
      
      console.log(`[BrowserStorage] Cleaned up ${deletedCount} old projects`);
      return deletedCount;
    } catch (error) {
      console.error('[BrowserStorage] Failed to cleanup old projects:', error);
      return 0;
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    archivedProjects: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const allProjects = await this.listProjects({ includeArchived: true });
      const archivedProjects = await this.listArchivedProjects();
      
      const stats = {
        totalProjects: allProjects.length,
        activeProjects: allProjects.length - archivedProjects.length,
        archivedProjects: archivedProjects.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      };
      
      allProjects.forEach(p => {
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
        stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('[BrowserStorage] Failed to get storage stats:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        archivedProjects: 0,
        byType: {},
        byStatus: {},
      };
    }
  }

  // ============== Review storage (per chunk) ==============
  async saveReview(projectId: string, chunkId: string, issues: Array<Record<string, any>>): Promise<void> {
    try {
      const store = await this.getStore(REVIEW_STORE, 'readwrite');
      const record: ReviewRecord = {
        key: `${projectId}:${chunkId}`,
        projectId,
        chunkId,
        issues,
        updated_at: new Date().toISOString(),
      };
      await new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to save review:', error);
      throw error;
    }
  }

  async getReview(projectId: string, chunkId: string): Promise<Array<Record<string, any>> | null> {
    try {
      const store = await this.getStore(REVIEW_STORE, 'readonly');
      return await new Promise((resolve, reject) => {
        const req = store.get(`${projectId}:${chunkId}`);
        req.onsuccess = () => {
          const record = req.result as ReviewRecord | undefined;
          resolve(record ? record.issues : null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to load review:', error);
      return null;
    }
  }

  async deleteReview(projectId: string, chunkId: string): Promise<void> {
    try {
      const store = await this.getStore(REVIEW_STORE, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const req = store.delete(`${projectId}:${chunkId}`);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('[BrowserStorage] Failed to delete review:', error);
    }
  }

  // Close database connection
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const browserStorage = new BrowserStorage();

