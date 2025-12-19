import { Button, Card, CardBody, CardHeader, Divider, Input, Listbox, ListboxItem, Select, SelectItem } from "@nextui-org/react";
import { useState } from "react";
import { FaPaintBrush } from "react-icons/fa";
import { useModelStore } from '../model/Model';
import { useStudyStore } from "../study/StudyModel";
import { listProjects } from "../review/ProjectData";

export default function Launcher() {
  const [accessKey, setAccessKey] = useState('');
  const [pid, setPid] = useState(-1);
  const setOpenAIKey = useModelStore((state) => state.setOpenAIKey);
  const resetModel = useModelStore((state) => state.reset);
  const resetStudyModel = useStudyStore((state) => state.reset);

  function startExample(text: string) {
    resetModel();
    resetStudyModel();
    useModelStore.setState({
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
    })

    useModelStore.getState().refreshTextFields();

    window.location.hash = '/free-form' + `?k=${btoa(accessKey)}`;
}

  const projects = listProjects();

  return <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
    <Card>
        <CardHeader><span style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5, fontWeight: 600}}><FaPaintBrush /> Textoshop</span></CardHeader>
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
            <span style={{fontWeight: 800}}>Projects</span>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, width: 520}}>
              {projects.length === 0 && <div>No projects found under /projects</div>}
              {projects.length > 0 &&
                <Listbox aria-label="Projects">
                  {projects.map(p => (
                    <ListboxItem key={p.id} textValue={p.id} onClick={() => {
                      window.location.hash = `/review/${p.id}` + (accessKey ? `?k=${btoa(accessKey)}` : '');
                    }}>{p.id}</ListboxItem>
                  ))}
                </Listbox>
              }
            </div>
        </CardBody>
    </Card>
    </div>
}