import { create } from 'zustand';
import { useStudyStore } from '../study/StudyModel';
import { ModelState, useModelStore } from './Model';



/** 
 * Model 
 **/
interface UndoModelState {
    undoStack : ModelState[];
    redoStack : ModelState[];
    lastStoredStateTimestamp : number;
    isDisabled : boolean;
}

interface UndoModelAction {
    reset: () => void
    undo: () => void
    redo: () => void
    storeUndoState: () => void
    storeUndoStateDebounced: () => void
    setIsDisabled: (isDisabled: boolean) => void
}

function getInitialState() : UndoModelState {
    return {
        undoStack: [],
        redoStack: [],
        lastStoredStateTimestamp: 0,
        isDisabled: false
    }
}


export const useUndoModelStore = create<UndoModelState & UndoModelAction>()((set, get) => ({
    ...getInitialState(),
    reset: () => set((state) => ({ ...getInitialState() })),
    undo: () => {
        const { undoStack, redoStack } = get();
        if (undoStack.length > 0) {
            const newState = undoStack.pop();
            if (newState) {
                const modelState = JSON.parse(JSON.stringify(useModelStore.getState()));
                redoStack.push(modelState);
                set((state) => ({ undoStack: undoStack, redoStack: redoStack, isDisabled: true }));
                useModelStore.setState(JSON.parse(JSON.stringify(newState)));
                useModelStore.getState().animateNextChanges();
                useModelStore.getState().refreshTextFields();
                set((state) => ({ isDisabled: false }));
                useStudyStore.getState().logEvent("UNDO", { undoStackLength: undoStack.length, redoStackLength: redoStack.length });
            }
        }
    },

    redo: () => {
        const { undoStack, redoStack } = get();
        if (redoStack.length > 0) {
            const newState = redoStack.pop();
            if (newState) {
                const modelState = JSON.parse(JSON.stringify(useModelStore.getState()));
                undoStack.push(modelState);
                set((state) => ({ undoStack: undoStack, redoStack: redoStack, isDisabled: true}));
                useModelStore.setState(JSON.parse(JSON.stringify(newState)));
                useModelStore.getState().animateNextChanges();
                useModelStore.getState().refreshTextFields();
                set((state) => ({ isDisabled: false }));
                useStudyStore.getState().logEvent("REDO", { undoStackLength: undoStack.length, redoStackLength: redoStack.length });
            }
        }
    },

    storeUndoState: () => {
        const { undoStack } = get();
        const modelState = JSON.parse(JSON.stringify(useModelStore.getState()));
        undoStack.push(modelState);
        set((state) => ({ undoStack: undoStack, redoStack: [], lastStoredStateTimestamp: Date.now() }));
    },

    storeUndoStateDebounced: () => {
        const { lastStoredStateTimestamp, isDisabled } = get();
        const now = Date.now();
        if (now - lastStoredStateTimestamp > 1000) {
            if (!isDisabled) {
                const stringifiedState = JSON.stringify(useModelStore.getState());
                const lastStringifiedState = get().undoStack.length > 0 ? JSON.stringify(get().undoStack[get().undoStack.length - 1]) : "";

                if (stringifiedState !== lastStringifiedState) {
                    const modelState = JSON.parse(stringifiedState);
                    set((state) => ({ undoStack: [...state.undoStack, modelState], redoStack: [], lastStoredStateTimestamp: now }));
                }
            }
        } else {
            set((state) => ({ lastStoredStateTimestamp: now }));
        }
    },

    setIsDisabled: (isDisabled: boolean) => set((state) => ({ isDisabled: isDisabled }))
}))


//         
