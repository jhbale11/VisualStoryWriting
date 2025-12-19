import { Card, CardBody, CardHeader, Divider, Input, Listbox, ListboxItem, Progress } from '@nextui-org/react'
import { useEffect, useMemo, useState } from 'react'
import { DiscoveredProject, computeProjectProgress, hasProjects, listProjects, loadProjectById } from './ProjectData'

export default function ProjectList() {
  const [apiKey, setApiKey] = useState('')
  const [projects, setProjects] = useState<DiscoveredProject[]>([])

  useEffect(() => {
    setProjects(listProjects())
  }, [])

  const go = (id: string) => {
    window.location.hash = `/review/${id}?k=${btoa(apiKey)}`
  }

  return (
    <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
      <Card>
        <CardHeader>
          <span style={{fontWeight: 700}}>Translation Review</span>
        </CardHeader>
        <Divider />
        <CardBody>
          <Input variant="faded" label="API Key" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </CardBody>
        <Divider />
        <CardBody>
          <span style={{fontWeight: 700}}>Projects</span>
          <div style={{marginTop: 10, width: 420}}>
            {!hasProjects() && <div>No projects found under /projects</div>}
            <Listbox aria-label="Projects">
              {projects.map(p => {
                const pj = loadProjectById(p.id)
                const prog = pj ? computeProjectProgress(pj) : { total: 0, proofread: 0, withFinal: 0, percent: 0 }
                return (
                  <ListboxItem key={p.id} onClick={() => go(p.id)} textValue={p.id}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span>{p.id}</span>
                        <span style={{color: '#666'}}>{prog.proofread}/{prog.total}</span>
                      </div>
                      <Progress size='sm' value={prog.percent} aria-label='Progress' />
                    </div>
                  </ListboxItem>
                )
              })}
            </Listbox>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}


