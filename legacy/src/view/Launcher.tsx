import { Button, Card, CardBody, CardHeader, Divider, Input, Select, SelectItem } from "@nextui-org/react";
import { useState } from "react";
import { MdHistoryEdu } from "react-icons/md";
import { useModelStore } from '../model/Model';
import { extractedEntitiesToNodeEntities } from "../model/prompts/textExtractors/EntitiesExtractor";
import { extractedLocationsToNodeLocations } from "../model/prompts/textExtractors/LocationsExtractor";
import { extractedActionsToEdgeActions } from "../model/prompts/textExtractors/SentenceActionsExtractor";
import { VisualRefresher } from "../model/prompts/textExtractors/VisualRefresher";
import { dataTextAlice, textAlice } from "../study/data/TextAlice";
import { dataTextB, textB } from "../study/data/TextB";
import { dataTextD, textD } from "../study/data/TextD";
import { useStudyStore } from "../study/StudyModel";

export default function Launcher() {
  const [accessKey, setAccessKey] = useState('');
  const [pid, setPid] = useState(-1);
  const setOpenAIKey = useModelStore((state) => state.setOpenAIKey);
  const resetModel = useModelStore((state) => state.reset);
  const resetStudyModel = useStudyStore((state) => state.reset);

  function startExample(text : string, data : any) {
    resetModel();
    resetStudyModel();

    useModelStore.getState().setTextState([{ children: [{text: text }] }], true, false);
    useModelStore.getState().setIsStale(false);
    VisualRefresher.getInstance().previousText = useModelStore.getState().text;
    VisualRefresher.getInstance().onUpdate();

    if (data) {
        const entityNodes = extractedEntitiesToNodeEntities(data);
        const locationNodes = extractedLocationsToNodeLocations(data);
        const actionEdges = data.actions.map((h : any) => extractedActionsToEdgeActions({actions: [h]}, h.passage, entityNodes)).flat();
        useModelStore.getState().setEntityNodes(entityNodes);
        useModelStore.getState().setLocationNodes(locationNodes);
        useModelStore.getState().setActionEdges(actionEdges);
    } else {
        const locationNodes = extractedLocationsToNodeLocations({
            locations: [{
                name: "unknown",
                emoji: "🌍",
            }]
        });

        useModelStore.getState().setLocationNodes(locationNodes);
        useModelStore.getState().setEntityNodes([]);
        useModelStore.getState().setActionEdges([]);
    }

    window.location.hash = '/free-form' + `?k=${btoa(accessKey)}`;
}

  return <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
    <Card>
        <CardHeader><span style={{fontSize: 25}}><MdHistoryEdu /></span><span style={{marginLeft: 5}}>Visual Story-Writing</span></CardHeader>
        <Divider />
        <CardBody>
            <p>To run the examples below, please paste an OpenAI API key. You can obtain one from <a href="https://platform.openai.com/account/api-keys">here</a>.</p>
            <Input variant="faded" label="API Key" placeholder="sk-..." style={{marginTop: 10}}
            onChange={(e) => {
                setAccessKey(e.target.value);
                setOpenAIKey(e.target.value);
            }}
            ></Input>
        </CardBody>
        <Divider />
        <CardBody>
            <span style={{fontWeight: 800}}>Shortcuts to try out Visual Story-Writing on examples</span>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, marginTop: 10}}>
                <Button 
                isDisabled={accessKey.length === 0}
                    onClick={() => {
                        startExample(textAlice, dataTextAlice)
                    }}
                >Alice in Wonderland</Button>
                
                <Button
                isDisabled={accessKey.length === 0}
                onClick={() => {
                    startExample(textB, dataTextB)
                }}  
                >Sled Adventure</Button>

<Button
                isDisabled={accessKey.length === 0}
                onClick={() => {
                    startExample(textD, dataTextD)
                }}  
                >Waves Apart</Button>

                <Button
                isDisabled={accessKey.length === 0}
                    onClick={() => {
                        startExample("", null);
                    }}
                >Blank Page</Button>
            </div>
        </CardBody>
        <Divider />
        <CardBody>
            <span style={{fontWeight: 800}}>Run study 1</span>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center', gap: 40, marginTop: 10}}>
                <Select isDisabled={accessKey.length === 0}
                variant="faded" label="Participant ID" className="max-w-xs" 
                onChange={(e) => setPid(parseInt(e.target.value))}>
                    {
                        Array.from({length: 12}, (_, i) => i).map((i) => <SelectItem key={i} value={i+1} textValue={"P" + (i+1)}>P{i+1}</SelectItem>)
                    }
                </Select>
                <Button
                    isDisabled={accessKey.length === 0 || pid === -1}
                    onClick={() => {
                        resetModel();
                        resetStudyModel();
                        window.location.hash = '/study' + '?pid=' + (pid+1) + `&k=${btoa(accessKey)}` + '&studyType=READING';
                    }}
                >Start</Button>
            </div>
        </CardBody>
        <Divider />
        <CardBody>
            <span style={{fontWeight: 800}}>Run study 2</span>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center', gap: 40, marginTop: 10}}>
                <Select isDisabled={accessKey.length === 0}
                variant="faded" label="Participant ID" className="max-w-xs" 
                onChange={(e) => setPid(parseInt(e.target.value))}>
                    {
                        Array.from({length: 12}, (_, i) => i).map((i) => <SelectItem key={i} value={i+1} textValue={"P" + (i+1)}>P{i+1}</SelectItem>)
                    }
                </Select>
                <Button
                    isDisabled={accessKey.length === 0 || pid === -1}
                    onClick={() => {
                        resetModel();
                        resetStudyModel();
                        window.location.hash = '/study' + '?pid=' + (pid+1) + `&k=${btoa(accessKey)}` + '&studyType=WRITING';
                    }}
                >Start</Button>
            </div>
        </CardBody>
        <Divider />
        <CardBody>
            <span style={{fontWeight: 800}}>Translation System (LangGraph)</span>
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'left', alignItems: 'center', gap: 40, marginTop: 10}}>
                <Button
                    onClick={() => {
                        window.location.hash = '/translation';
                    }}
                >Open Translation System</Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Korean to Japanese/English translation with AI-powered glossary building
            </p>
        </CardBody>
    </Card>
    </div>
}