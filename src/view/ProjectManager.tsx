import { Button, Card, CardBody, CardHeader, Divider, Input } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import { useGlossaryStore } from '../model/GlossaryModel';
import { useModelStore } from '../model/Model';

type SavedProject = {
  id: string;
  name: string;
  updatedAt: number;
  glossary: ReturnType<typeof getGlossarySnapshot>;
  view: ReturnType<typeof getViewSnapshot> & { relationsPositions?: Record<string, { x: number, y: number }> };
}

function getGlossarySnapshot() {
  const s = useGlossaryStore.getState();
  return {
    characters: s.characters,
    events: s.events,
    locations: s.locations,
    terms: s.terms,
    fullText: s.fullText,
  };
}

function getViewSnapshot() {
  const s = useModelStore.getState();
  return {
    entityNodes: s.entityNodes,
    actionEdges: s.actionEdges,
    locationNodes: s.locationNodes,
    textState: s.textState,
    isReadOnly: s.isReadOnly,
  };
}

function loadGlossarySnapshot(snapshot: ReturnType<typeof getGlossarySnapshot>) {
  useGlossaryStore.setState({
    characters: snapshot.characters,
    events: snapshot.events,
    locations: snapshot.locations,
    terms: snapshot.terms,
    fullText: snapshot.fullText,
  });
}

function loadViewSnapshot(snapshot: ReturnType<typeof getViewSnapshot>) {
  const s = useModelStore.getState();
  s.setEntityNodes(snapshot.entityNodes);
  s.setActionEdges(snapshot.actionEdges);
  s.setLocationNodes(snapshot.locationNodes);
  s.setTextState(snapshot.textState, true, false);
  s.setIsReadOnly(snapshot.isReadOnly);
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vsw.projects') || '[]';
      setProjects(JSON.parse(raw));
    } catch {}
  }, []);

  const saveProject = () => {
    const raw = localStorage.getItem('vsw.projects') || '[]';
    const arr: SavedProject[] = JSON.parse(raw);
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto ? crypto.randomUUID() : `p-${Date.now()}`);
    const project: SavedProject = {
      id,
      name: name || `Project ${new Date().toLocaleString()}`,
      updatedAt: Date.now(),
      glossary: getGlossarySnapshot(),
      view: { ...getViewSnapshot(), relationsPositions: JSON.parse(localStorage.getItem('vsw.relations.positions') || '{}') },
    };
    const next = [project, ...arr];
    localStorage.setItem('vsw.projects', JSON.stringify(next));
    setProjects(next);
    setName('');
    try { localStorage.setItem('vsw.currentProjectId', id); } catch {}
  };

  const loadProject = (p: SavedProject) => {
    loadGlossarySnapshot(p.glossary);
    loadViewSnapshot(p.view);
    try {
      const positions = p.view && (p.view as any).relationsPositions ? (p.view as any).relationsPositions : {};
      localStorage.setItem('vsw.relations.positions', JSON.stringify(positions));
      localStorage.setItem('vsw.currentProjectId', p.id);
    } catch {}
    window.location.hash = '/glossary-builder';
  };

  const deleteProject = (id: string) => {
    const next = projects.filter(p => p.id !== id);
    localStorage.setItem('vsw.projects', JSON.stringify(next));
    setProjects(next);
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Project Manager</h1>
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>Create or Save Current</span>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'flex', gap: 10 }}>
            <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button color="secondary" onClick={saveProject}>Save current</Button>
            <Button variant="bordered" onClick={() => window.location.hash = '/glossary-uploader'}>New from text</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>Your Projects</span>
            <Input size="sm" placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 240 }} />
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {filtered.map(p => (
              <Card key={p.id} isHoverable isPressable>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{new Date(p.updatedAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" variant="flat" onClick={() => loadProject(p)}>Open</Button>
                      <Button size="sm" variant="light" color="danger" onClick={() => deleteProject(p.id)}>Delete</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {filtered.length === 0 && <div style={{ color: '#888' }}>No projects yet.</div>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}


