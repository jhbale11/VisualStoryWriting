// Stub for useStudyStore to avoid dependencies on study module
import { create } from 'zustand';

interface StudyState {
  logEvent: (eventName: string, data?: any) => void;
  disableTools: boolean;
  disableTonePicker: boolean;
  disableLayers: boolean;
}

export const useStudyStore = create<StudyState>(() => ({
  logEvent: (eventName: string, data?: any) => {
    // No-op for review mode
  },
  disableTools: false,
  disableTonePicker: false,
  disableLayers: false,
}));



