import { create } from 'zustand';
import { useModelStore } from '../model/Model';
import { useUndoModelStore } from '../model/UndoModel';
import { useViewModelStore } from '../model/ViewModel';
import { StudyStep } from './StudyTaskGenerator';

const TIMEOUT_TIME = 4 * 60 * 1000; // 4 min
let previousTimeout: NodeJS.Timeout | null = null;

/** 
 * Model 
 **/
interface StudyModelState {
    participantId: number,
    stepId: number,
    steps: StudyStep[],
    isDataSaved: boolean,
    csvData: string,
    isOutOfTime: boolean,
    disableTools: boolean,
    disableTonePicker: boolean,
    disableDragging: boolean,
    disableResizing: boolean,
    disableLayers: boolean
}

interface StudyModelAction {
    reset: () => void,
    resetStep: () => void,
    setParticipantId: (participantId: number) => void,
    setStepId: (stepId: number) => void,
    setSteps: (steps: StudyStep[]) => void,
    nextStep: () => void,
    saveData: (clear?: boolean) => void,
    logEvent: (eventName: string, parameters?: any) => void,
    setIsDataSaved: (isDataSaved: boolean) => void,
    setFreeformText: (text: string) => void
}


const initialState: StudyModelState = {
    participantId: -1,
    stepId: -1,
    isDataSaved: true,
    csvData: "Timestamp,ParticipantId,StepId,StepType,Task,Condition,Event,Parameters",
    steps: [],
    isOutOfTime: false,
    disableTools: false,
    disableTonePicker: false,
    disableDragging: false,
    disableResizing: false,
    disableLayers: false
}




export const useStudyStore = create<StudyModelState & StudyModelAction>()((set, get) => ({
    ...initialState,
    reset: () => set((state) => ({ ...initialState })),
    setParticipantId: (participantId: number) => set((state) => ({ participantId: participantId })),
    resetStep: () => {
        useModelStore.getState().reset();
        useViewModelStore.getState().reset();
        useUndoModelStore.getState().reset();

        // Set the new text fields
        const step = JSON.parse(JSON.stringify(get().steps[get().stepId]));
        if (step.startingState) {
            useModelStore.setState(step.startingState);
            useModelStore.getState().refreshTextFields(true);
        }

        // Disable some elements depending on the task
        if (step.task === "CHANGE_TONE_DIALOGUE") {
            set((state) => ({
                disableTools: false,
                disableTonePicker: false,
                disableDragging: true,
                disableResizing: true,
                disableLayers: true
            }));
        } else if (step.task === "INTEGRATE_TEXT_FRAGMENTS") {
            set((state) => ({
                disableTools: true,
                disableTonePicker: true,
                disableDragging: false,
                disableResizing: true,
                disableLayers: true
            }));
        } else if (step.task === "SHORTEN_SQUASH_ORPHANS") {
            set((state) => ({
                disableTools: true,
                disableTonePicker: true,
                disableDragging: true,
                disableResizing: false,
                disableLayers: true
            }));
        } else if (step.task === "WRITE_EMAIL_USING_TEMPLATE") {
            set((state) => ({
                disableTools: true,
                disableTonePicker: true,
                disableDragging: true,
                disableResizing: true,
                disableLayers: false
            }));
        } else {
            set((state) => ({
                disableTools: false,
                disableTonePicker: false,
                disableDragging: false,
                disableResizing: false,
                disableLayers: false
            }));
        }


    },
    setStepId: (stepId: number) => {
        set((state) => ({ stepId: stepId }))

        if (get().stepId < get().steps.length) {
            const newStepId = get().stepId;
            const step = get().steps[newStepId];

            get().resetStep();


            if (get().isDataSaved && step.saveData && get().csvData.length > 0) {
                get().saveData();
            }

            // Set up a timeout of 3min before setting the isOutOfTime flag
            if (previousTimeout !== null) {
                // Clear any previous timeout
                clearTimeout(previousTimeout);
                previousTimeout = null;
            }

            set((state) => ({ isOutOfTime: false }));

            if (step.type === "TASK") {
                previousTimeout = setTimeout(() => {
                    useStudyStore.setState((state) => ({ isOutOfTime: true }));
                    useStudyStore.getState().logEvent("TIMEOUT_REACHED");
                }, TIMEOUT_TIME);    
            }
            useUndoModelStore.getState().reset();
        }

        // Change the URL to make it match if it is not already the case
        const hashSplitted = window.location.hash.split("?");
        const search = hashSplitted[hashSplitted.length - 1]
        const params = new URLSearchParams(search);

        if (params.get("stepId") !== get().stepId.toString()) {
            params.set("stepId", stepId.toString());
            window.location.hash = hashSplitted.slice(0, hashSplitted.length - 1).join("?") + "?" + params.toString();
        }
    },
    setSteps: (steps: StudyStep[]) => set((state) => ({ steps: steps })),
    nextStep: () => {
        if (get().stepId + 1 < get().steps.length) {
            get().setStepId(get().stepId + 1);
        }
    },
    logEvent(eventName: string, parameters?: any) {
        //console.log("LOG:", eventName, parameters)
        /*if (get().isDataSaved) {
            let strParams = parameters ? btoa(unescape(encodeURIComponent(JSON.stringify(parameters)))) : "";

            const currentStep = get().steps[get().stepId];
            if (currentStep) {
                const values = [Date.now(), get().participantId, get().stepId, currentStep.type, currentStep.task, currentStep.condition, eventName, strParams];
                set((state) => ({ csvData: state.csvData + "\n" + values.join(",") }));
            }
        }*/

    },

    saveData(clear = true): void {
        /*if (get().isDataSaved) {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(get().csvData));
            element.setAttribute('download', "P" + get().participantId + "_" + get().stepId + ".csv");

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);

            if (clear) {
                set((state) => ({ csvData: "" }))
            }
        }*/
    },

    setIsDataSaved: (isDataSaved) => set((state) => ({ isDataSaved: isDataSaved })),

    setFreeformText: (text: string) => {
        // Edit the step that has the type freeform
        const newSteps = JSON.parse(JSON.stringify(get().steps));
        for (let i = 0; i < newSteps.length; i++) {
            if (newSteps[i].task === "FREE_FORM") {
                newSteps[i].startingState = {
                    layers: [
                        {
                            id: "1", layer: {
                                name: "Layer 1", color: "white", isVisible: true, modifications: {},
                                state: [{
                                    //@ts-ignore
                                    type: "paragraph",
                                    children: [{
                                        text: text
                                    }],
                                }]
                            }
                        }
                    ]
                }
            }
        }
        set((state) => ({ steps: newSteps }));
    }
}))


//         
