import { Button, Card, CardBody, CardHeader, Divider, Input } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import { useGlossaryStore, serializeGlossaryState, restoreGlossarySnapshot } from '../model/GlossaryModel';
import { glossaryProjectStorage } from '../glossary/services/GlossaryProjectStorage';
import type { GlossaryProjectRecord } from '../glossary/types';
import { captureViewSnapshot, applyViewSnapshot } from '../glossary/utils/viewSnapshots';
import { activeGlossaryCache } from '../glossary/services/ActiveGlossaryCache';

export default function ProjectManager() {
  const [projects, setProjects] = useState<GlossaryProjectRecord[]>([]);
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    glossaryProjectStorage.listProjects()
      .then(list => {
        if (mounted) setProjects(list);
      })
      .catch(error => console.error('[ProjectManager] Failed to load projects', error));
    return () => { mounted = false; };
  }, []);

  const saveProject = async () => {
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto ? crypto.randomUUID() : `p-${Date.now()}`);
    const projectName = name || `Project ${new Date().toLocaleString()}`;
    const glossarySnapshot = serializeGlossaryState();
    const viewSnapshot = captureViewSnapshot();
    const record: GlossaryProjectRecord = {
      id,
      name: projectName,
      updatedAt: Date.now(),
      glossary: glossarySnapshot,
      view: viewSnapshot,
    };

    try {
      await glossaryProjectStorage.saveProject(record);
      setProjects(prev => [record, ...prev.filter(p => p.id !== id)]);
      setName('');
      localStorage.setItem('vsw.currentProjectId', id);
      activeGlossaryCache.saveFromRecord(record);
    } catch (error) {
      console.error('[ProjectManager] Failed to save project', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const loadProject = async (project: GlossaryProjectRecord) => {
    try {
      const latest = await glossaryProjectStorage.getProject(project.id) || project;
      if (latest.glossary) {
        restoreGlossarySnapshot(latest.glossary, { fullTextFallback: latest.glossary.fullText || '' });
      } else {
        useGlossaryStore.getState().reset();
      }
      applyViewSnapshot(latest.view);
      localStorage.setItem('vsw.currentProjectId', latest.id);
      activeGlossaryCache.saveFromRecord(latest);
      window.location.hash = '/glossary-builder';
    } catch (error) {
      console.error('[ProjectManager] Failed to load project', error);
      alert('Failed to load project.');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await glossaryProjectStorage.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('[ProjectManager] Failed to delete project', error);
      alert('Failed to delete project.');
    }
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


