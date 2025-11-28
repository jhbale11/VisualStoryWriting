import type { GlossarySnapshot } from '../../model/GlossaryModel';
import type { GlossaryViewState, GlossaryProjectRecord } from '../types';

const ACTIVE_KEY = 'vsw.activeGlossaryProject';

export interface ActiveGlossaryPayload {
  id: string;
  updatedAt: number;
  glossary: GlossarySnapshot;
  view?: GlossaryViewState;
}

const safeParse = (): ActiveGlossaryPayload | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveGlossaryPayload;
  } catch (error) {
    console.warn('[ActiveGlossaryCache] Failed to parse cache', error);
    return null;
  }
};

const savePayload = (payload: ActiveGlossaryPayload) => {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[ActiveGlossaryCache] Failed to save cache', error);
  }
};

export const activeGlossaryCache = {
  load(projectId?: string): ActiveGlossaryPayload | null {
    const payload = safeParse();
    if (!payload) return null;
    if (projectId && payload.id !== projectId) {
      return null;
    }
    return payload;
  },

  save(payload: ActiveGlossaryPayload) {
    savePayload(payload);
  },

  saveFromRecord(record: GlossaryProjectRecord) {
    if (!record.glossary) return;
    savePayload({
      id: record.id,
      updatedAt: record.updatedAt,
      glossary: record.glossary,
      view: record.view,
    });
  },

  clear() {
    localStorage.removeItem(ACTIVE_KEY);
  },
};

