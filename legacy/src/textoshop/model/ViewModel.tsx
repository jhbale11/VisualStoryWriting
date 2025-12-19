import { BaseRange } from 'slate';
import { create } from 'zustand';
import { useStudyStore } from '../study/StudyModel';


export interface DraggingParameters {
    offsetX: number,
    offsetY: number,
    cloned: boolean,
    elementId: string,
    initialX: number,
    initialY: number,
    initialStyle?: { position: string, opacity: string, left: string, top: string, zIndex: string },
    onElementDropped?: (draggingParameters: DraggingParameters, element: HTMLElement | null) => void
}


interface HoveredSentence {
    cursorRange: Range | null,
    caretPosition: { offset: number, offsetNode: Node } | null,
    range : Range,
    rects: DOMRect[],
    textfieldId: string,
    position: { x: number, y: number },
    slateRange: BaseRange
  }

/** 
 * Model 
 **/
interface ModelState {
    dragging: boolean,
    draggingParameters: DraggingParameters[]
    isPromptBoxOpen: boolean
    sentenceHovered: HoveredSentence | null
    onPromptBoxValidated?: (value: string) => void
}

interface ModelAction {
    reset: () => void
    startDragging: (parameters: DraggingParameters[]) => void
    setDraggingParameters: (parameters: DraggingParameters[]) => void
    stopDragging: () => void
    openPromptBox: () => void
    closePromptBox: () => void
    setPromptBoxValidatedCallback: (callback: (value: string) => void) => void
    setSentenceHovered: (sentence: HoveredSentence | null) => void
}


const initialState: ModelState = {
    dragging: false,
    draggingParameters: [],
    isPromptBoxOpen: false,
    onPromptBoxValidated: undefined,
    sentenceHovered: null
}


export const useViewModelStore = create<ModelState & ModelAction>()((set, get) => ({
    ...initialState,
    reset: () => set((state) => ({ ...initialState })),
    
    startDragging: (parameters: DraggingParameters[]) => {
        useStudyStore.getState().logEvent("START_DRAGGING", { parameters: parameters });
        set((state) => ({
            dragging: true,
            draggingParameters: parameters
        }))
    },
    setDraggingParameters: (parameters: DraggingParameters[]) => set((state) => ({
        draggingParameters: parameters
    })),
    stopDragging: () => {
        useStudyStore.getState().logEvent("STOP_DRAGGING", { parameters: get().draggingParameters });
        set((state) => ({ dragging: false, draggingParameters: [] }))
    },
    openPromptBox: () => set((state) => ({ isPromptBoxOpen: true })),
    closePromptBox: () => set((state) => ({ isPromptBoxOpen: false })),
    setPromptBoxValidatedCallback: (callback: (value: string) => void) => set((state) => ({ onPromptBoxValidated: callback })),
    setSentenceHovered: (sentence: HoveredSentence | null) => set((state) => ({ sentenceHovered: sentence }))
}))


//         
