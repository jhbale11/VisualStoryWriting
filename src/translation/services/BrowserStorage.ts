/**
 * Browser-compatible storage service using IndexedDB
 * This replaces Prisma for client-side storage
 */

import type { TranslationProject } from '../types';

const DB_NAME = 'translation-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

class BrowserStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('is_archived', 'is_archived', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction([STORE_NAME], mode);
    return transaction.objectStore(STORE_NAME);
  }

  // Check if project is completed
  private isCompleted(project: TranslationProject): boolean {
    const completedStatuses = ['glossary_completed', 'translation_completed', 'review_completed'];
    return completedStatuses.includes(project.status);
  }

  // Save project to IndexedDB
  async saveProject(project: TranslationProject): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
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
      const store = await this.getStore('readonly');
      
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
    type?: 'translation' | 'glossary';
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const store = await this.getStore('readonly');
      
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
    type?: 'translation' | 'glossary';
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const store = await this.getStore('readonly');
      
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
      
      const store = await this.getStore('readwrite');
      
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

