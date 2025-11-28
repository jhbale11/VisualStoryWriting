import type { GlossaryProjectRecord } from '../types';

const DB_NAME = 'glossary-projects-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

class GlossaryProjectStorage {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) {
      throw new Error('Glossary DB failed to initialize');
    }
    const tx = this.db.transaction([STORE_NAME], mode);
    return tx.objectStore(STORE_NAME);
  }

  async saveProject(project: GlossaryProjectRecord): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...project,
        updatedAt: project.updatedAt || Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateProject(id: string, updates: Partial<GlossaryProjectRecord>): Promise<void> {
    const existing = await this.getProject(id);
    if (!existing) {
      throw new Error(`Glossary project ${id} not found`);
    }
    await this.saveProject({
      ...existing,
      ...updates,
      updatedAt: updates.updatedAt || Date.now(),
    });
  }

  async getProject(id: string): Promise<GlossaryProjectRecord | undefined> {
    const store = await this.getStore('readonly');
    return await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as GlossaryProjectRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async listProjects(): Promise<GlossaryProjectRecord[]> {
    const store = await this.getStore('readonly');
    return await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = (request.result as GlossaryProjectRecord[]) || [];
        projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const glossaryProjectStorage = new GlossaryProjectStorage();

