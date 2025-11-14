export interface TranslationData {
  final?: string
  proofread?: string
}

export interface ProjectChunk {
  id: string
  index: number
  text: string
  translations?: TranslationData
}

export interface ProjectJson {
  chunks: ProjectChunk[]
}

export interface DiscoveredProject {
  id: string
  path: string
}

// Discover all project.json files under ../../projects/*/project.json at build time
const eagerProjectModules: Record<string, string> = import.meta.glob(
  '../../projects/*/project.json',
  { as: 'raw', eager: true }
) as any

function extractProjectIdFromPath(path: string): string {
  const parts = path.split('/')
  const idx = parts.findIndex(p => p === 'projects')
  if (idx >= 0 && idx + 1 < parts.length) {
    return parts[idx + 1]
  }
  return path
}

export function listProjects(): DiscoveredProject[] {
  const paths = Object.keys(eagerProjectModules)
  return paths.map(p => ({ id: extractProjectIdFromPath(p), path: p }))
}

export function hasProjects(): boolean {
  return Object.keys(eagerProjectModules).length > 0
}

export function loadProjectById(projectId: string): ProjectJson | null {
  const entry = Object.entries(eagerProjectModules).find(([path]) => extractProjectIdFromPath(path) === projectId)
  if (!entry) return null
  try {
    const raw = entry[1]
    const parsed = JSON.parse(raw) as ProjectJson
    return parsed
  } catch (e) {
    console.error('Failed to parse project.json for', projectId, e)
    return null
  }
}

export function getAllChunkIndices(project: ProjectJson): number[] {
  return project.chunks.map(c => c.index).sort((a, b) => a - b)
}

export function getChunkByIndex(project: ProjectJson, index: number): ProjectChunk | null {
  const found = project.chunks.find(c => c.index === index)
  return found || null
}

export function getPreferredEnglish(chunk: ProjectChunk): string {
  return chunk.translations?.proofread || chunk.translations?.final || ''
}

export function computeProjectProgress(project: ProjectJson): { total: number, proofread: number, withFinal: number, percent: number } {
  const total = project.chunks.length
  let proofread = 0
  let withFinal = 0
  for (const c of project.chunks) {
    if (c.translations?.final) withFinal++
    if (c.translations?.proofread && c.translations.proofread.trim().length > 0) proofread++
  }
  const percent = total > 0 ? Math.round((proofread / total) * 100) : 0
  return { total, proofread, withFinal, percent }
}

export function buildProjectTxt(project: ProjectJson): string {
  const sorted = [...project.chunks].sort((a, b) => a.index - b.index)
  const parts: string[] = []
  for (const c of sorted) {
    const en = getPreferredEnglish(c)
    parts.push(en)
  }
  return parts.join('\n\n')
}


