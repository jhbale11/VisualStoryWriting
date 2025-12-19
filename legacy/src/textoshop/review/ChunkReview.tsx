import { Button, Divider, Modal, ModalBody, ModalContent, ModalHeader, Select, SelectItem, Textarea, useDisclosure } from '@nextui-org/react'
import { useEffect, useMemo, useState } from 'react'
import TextoshopInterface from '../view/TextoshopInterface'
import { textFieldEditors, useModelStore } from '../model/Model'
import { ProjectJson, buildProjectTxt, getAllChunkIndices, getChunkByIndex, getPreferredEnglish, loadProjectById } from './ProjectData'
import { z } from 'zod'
// import { Transforms } from 'slate'
// import { SlateUtils } from '../model/utils/SlateUtils'
import { ReactEditor } from 'slate-react'
import { Editor, Transforms } from 'slate'
import { SlateUtils } from '../model/utils/SlateUtils'

export default function ChunkReview() {
  const [projectId, setProjectId] = useState('')
  const [project, setProject] = useState<ProjectJson | null>(null)
  const [chunkIndex, setChunkIndex] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const reviewModal = useDisclosure()
  type Severity = 'high' | 'medium' | 'low'
  interface ReviewIssue { start?: number, end?: number, text?: string, category: string, subcategory?: string, severity: Severity, message: string, suggestion?: string }
  const [parsedIssues, setParsedIssues] = useState<ReviewIssue[]>([])
  const [issuePositions, setIssuePositions] = useState<{top: number, left: number, textRect: DOMRect}[]>([])

  const CATEGORY_COLOR: { [k: string]: string } = {
    Accuracy: 'rgba(239, 68, 68, 0.35)', // red
    Fluency: 'rgba(59, 130, 246, 0.35)', // blue
    Terminology: 'rgba(16, 185, 129, 0.35)', // emerald
    Consistency: 'rgba(245, 158, 11, 0.35)', // amber
    Style: 'rgba(168, 85, 247, 0.35)', // purple
    Localization: 'rgba(234, 88, 12, 0.35)', // orange
  }

  // helper removed (no longer needed)

  function findIssuePositions() {
    const editor = textFieldEditors['translationField']
    if (!editor || parsedIssues.length === 0) return
    
    const trEl = document.getElementById('translationField')
    if (!trEl) return

    const text = (Editor as any).string(editor)
    const state = editor.children as any
    const positions: {top: number, left: number, textRect: DOMRect}[] = []

    for (const issue of parsedIssues) {
      let start = issue.start
      let end = issue.end
      if ((start === undefined || end === undefined) && issue.text) {
        const at = text.indexOf(issue.text)
        if (at >= 0) { start = at; end = at + issue.text.length }
      }
      if (start === undefined || end === undefined) {
        positions.push({ top: 0, left: 0, textRect: new DOMRect() })
        continue
      }

      const a = SlateUtils.toSlatePoint(state, start)
      const b = SlateUtils.toSlatePoint(state, end)
      
      if (a && b) {
        try {
          const domRange = ReactEditor.toDOMRange(editor as any, { anchor: a, focus: b } as any)
          const rect = domRange.getBoundingClientRect()
          const trRect = trEl.getBoundingClientRect()
          
          // Calculate position relative to the translation field container
          const relativeTop = rect.top - trRect.top + trEl.scrollTop
          const relativeLeft = rect.right - trRect.left
          
          positions.push({ 
            top: relativeTop, 
            left: relativeLeft,
            textRect: rect
          })
        } catch {
          positions.push({ top: 0, left: 0, textRect: new DOMRect() })
        }
      } else {
        positions.push({ top: 0, left: 0, textRect: new DOMRect() })
      }
    }

    setIssuePositions(positions)
  }

  function scrollToIssue(issue: ReviewIssue) {
    const editor = textFieldEditors['translationField']
    if (!editor) return
    const text = (Editor as any).string(editor)
    let start = issue.start
    let end = issue.end
    if ((start === undefined || end === undefined) && issue.text) {
      const hay = text
      const at = hay.indexOf(issue.text)
      if (at >= 0) { start = at; end = at + issue.text.length }
    }
    if (start === undefined || end === undefined) return
    const state = editor.children as any
    const a = SlateUtils.toSlatePoint(state, start)
    const b = SlateUtils.toSlatePoint(state, end)
    if (a && b) {
      Transforms.select(editor as any, { anchor: a, focus: b })
      ReactEditor.focus(editor as any)
      setTimeout(() => {
        try {
          const domRange = ReactEditor.toDOMRange(editor as any, { anchor: a, focus: b } as any)
          const rect = domRange.getBoundingClientRect()
          if (rect) {
            window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - 120), behavior: 'smooth' })
            const el = document.getElementById('translationField') as HTMLElement | null
            el?.scrollIntoView({ block: 'nearest' })
          }
        } catch {}
      }, 0)
    }
  }

  // Review notes are separate UI; no overlay re-application needed during edits

  const indices = useMemo(() => project ? getAllChunkIndices(project) : [], [project])

  useEffect(() => {
    const pathAndQuery = window.location.hash.replace(/^#/, '')
    const route = pathAndQuery.split('?')[0]
    const parts = route.split('/')
    if (parts.length >= 3) {
      const pid = parts[2]
      setProjectId(pid)
      const pj = loadProjectById(pid)
      setProject(pj)
      if (pj) setChunkIndex(getAllChunkIndices(pj)[0] ?? null)
    }
  }, [])

  useEffect(() => {
    if (!project || chunkIndex === null) return
    const chunk = getChunkByIndex(project, chunkIndex)
    if (!chunk) return
    const korean = chunk.text || ''
    const english = chunk.translations?.final || ''
    useModelStore.setState({
      layers: [
        { id: '1', layer: { name: 'Korean', color: 'white', isVisible: true, modifications: {}, state: [{
          //@ts-ignore
          type: 'paragraph', children: [{ text: korean }]
        }] }, children: [] },
        { id: '2', layer: { name: 'English', color: '#eef3ff', isVisible: true, modifications: {} }, children: [] },
        { id: '3', layer: { name: 'Scratch', color: '#fde68a', isVisible: false, modifications: {} }, children: [] }
      ] as any,
      textFields: [
        { id: 'mainTextField', x: 0, y: 0, width: 700, height: 0, isMoveable: false, isVisible: true, state: [{
          //@ts-ignore
          type: 'paragraph', children: [{ text: korean }]
        }] },
        { id: 'translationField', x: 0, y: 0, width: 700, height: 0, isMoveable: true, isVisible: true, state: [{
          //@ts-ignore
          type: 'paragraph', children: [{ text: english }]
        }] },
      ] as any,
      selectedLayerId: 0,
      selectedTool: useModelStore.getState().selectedTool,
    })
    useModelStore.getState().refreshTextFields(true)
    let cleanup: (() => void) | undefined
    const layout = () => {
      const mainEl = document.getElementById('mainTextField') as HTMLElement | null
      const trId = 'translationField'
      const trEl = document.getElementById(trId) as HTMLElement | null
      if (!mainEl) return
      const panelGap = 24
      const maxWidth = Math.max(600, Math.min(780, Math.floor(window.innerWidth / 2.5)))
      const top = 80
      const totalHeight = Math.min(window.innerHeight - 140, Math.max(mainEl.scrollHeight, trEl?.scrollHeight || 0, 600))
      const leftMain = 20
      const leftTrans = leftMain + maxWidth + panelGap
      useModelStore.getState().setTextField('mainTextField', { x: leftMain, y: top, width: maxWidth, height: totalHeight })
      useModelStore.getState().setTextField(trId, { x: leftTrans, y: top, width: maxWidth, height: totalHeight })
      mainEl.style.overflow = 'auto'
      if (trEl) trEl.style.overflow = 'auto'
      
      // Calculate issue positions after layout
      setTimeout(() => findIssuePositions(), 100)
      const onScroll = () => {
        if (!trEl) return
        const t = trEl
        const m = mainEl
        const tMax = Math.max(1, t.scrollHeight - t.clientHeight)
        const ratio = t.scrollTop / tMax
        const mMax = Math.max(1, m.scrollHeight - m.clientHeight)
        m.scrollTop = ratio * mMax
        // Force re-render of cards on scroll
        setIssuePositions(prev => [...prev])
      }
      trEl?.addEventListener('scroll', onScroll)
      const blockInput = (e: Event) => { e.preventDefault() }
      const blockKeys = (e: KeyboardEvent) => {
        const allowed = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Tab']
        if (!allowed.includes(e.key)) e.preventDefault()
      }
      mainEl.addEventListener('beforeinput', blockInput as any, true)
      mainEl.addEventListener('keydown', blockKeys, true)
      cleanup = () => {
        trEl?.removeEventListener('scroll', onScroll)
        mainEl.removeEventListener('beforeinput', blockInput as any, true)
        mainEl.removeEventListener('keydown', blockKeys, true)
      }
    }
    const id = window.setTimeout(layout, 0)
    const onResize = () => layout()
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('resize', onResize)
      if (cleanup) cleanup()
    }
  }, [project, chunkIndex])

  // Recalculate positions when issues change
  useEffect(() => {
    if (parsedIssues.length > 0) {
      const timer = setTimeout(() => findIssuePositions(), 150)
      return () => clearTimeout(timer)
    }
  }, [parsedIssues])

  if (!project) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Project not found.</div>
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee'}}>
        <span style={{fontWeight: 700}}>Project:</span>
        <span>{projectId}</span>
        <Divider orientation='vertical' />
        <span>Chunk:</span>
        <Select size='sm' selectedKeys={chunkIndex !== null ? [String(chunkIndex)] : []} onChange={(e) => setChunkIndex(parseInt(e.target.value))} className='max-w-xs'>
          {indices.map(i => <SelectItem key={i} value={String(i)} textValue={`Chunk ${i}`}>Chunk {i}</SelectItem>)}
        </Select>
        <Button size='sm' variant='flat' onClick={() => {
          if (!project || chunkIndex === null) return
          const idx = indices.indexOf(chunkIndex)
          if (idx > 0) setChunkIndex(indices[idx-1])
        }}>Prev</Button>
        <Button size='sm' variant='flat' onClick={() => {
          if (!project || chunkIndex === null) return
          const idx = indices.indexOf(chunkIndex)
          if (idx >= 0 && idx + 1 < indices.length) setChunkIndex(indices[idx+1])
        }}>Next</Button>
        <Divider orientation='vertical' />
        <Button size='sm' variant='light' onClick={() => { window.location.hash = '/review' }}>Back to projects</Button>
        <Button size='sm' color='primary' onClick={() => {
          const txt = buildProjectTxt(project)
          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${projectId}.txt`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }}>Download TXT</Button>
        {parsedIssues.length > 0 && (
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 6,
            background: parsedIssues.length >= 10 ? '#dcfce7' : '#fef3c7',
            color: parsedIssues.length >= 10 ? '#166534' : '#92400e'
          }}>
            {parsedIssues.length} {parsedIssues.length >= 10 ? '✓' : '⚠️'} issues
          </span>
        )}
        <Button size='sm' color='secondary' onClick={() => {
          if (chunkIndex === null) return
          const chunk = getChunkByIndex(project, chunkIndex)
          if (!chunk) return
          const ko = chunk.text || ''
          const en = getPreferredEnglish(chunk)
          
          console.log('=== Review Text Extraction (ChunkReview) ===')
          console.log('Korean text length:', ko.length)
          console.log('English text length:', en.length)
          console.log('Korean first 100 chars:', ko.substring(0, 100))
          console.log('English first 100 chars:', en.substring(0, 100))
          console.log('Korean last 100 chars:', ko.substring(Math.max(0, ko.length - 100)))
          console.log('English last 100 chars:', en.substring(Math.max(0, en.length - 100)))
          
          const schema = z.object({ issues: z.array(z.object({ text: z.string(), category: z.string(), subcategory: z.string().optional(), severity: z.enum(['high','medium','low']), message: z.string(), suggestion: z.string().optional() })) })
          const prompt = `You are a professional Korean→English novel translation reviewer. Your job is to provide comprehensive feedback.

TASK: Review the English translation against Korean source and provide EXACTLY 10-20 issues (NOT LESS THAN 10).

Return ONLY valid JSON:
{
  "issues": [
    { "text": string, "category": string, "subcategory"?: string, "severity": "high"|"medium"|"low", "message": string, "suggestion"?: string }
  ]
}

MANDATORY RULES - FOLLOW EXACTLY:
1. MINIMUM 10 ISSUES - This is NON-NEGOTIABLE. Even for good translations, find 10+ improvement areas.
2. Cover EVERY category (provide at least 2 from each):
   - Accuracy: mistranslations, omissions, additions, wrong meanings
   - Fluency: unnatural phrasing, awkward sentences, rhythm issues
   - Terminology: word choice, naming, technical terms
   - Consistency: contradictions, style shifts, format inconsistencies
   - Style: tone mismatches, register issues, literary quality
   - Localization: cultural references, idioms, context adaptation

3. "text" field MUST be exact substring from ENGLISH text below
4. Be GRANULAR - split compound issues into separate entries
5. Find issues in: word choices, sentence structure, punctuation, spacing, repetition, verb tenses, articles, prepositions, conjunctions
6. Even small improvements count as issues (severity: "low")
7. Look through THE ENTIRE text from beginning to end
8. DO NOT skip sections - review all paragraphs

CATEGORIES (use these exact strings):
- "Accuracy"
- "Fluency"
- "Terminology"
- "Consistency"
- "Style"
- "Localization"

KOREAN SOURCE (${ko.length} chars):
${ko}

ENGLISH TRANSLATION (${en.length} chars):
${en}

REMEMBER: You MUST return AT LEAST 10 issues. Count them before responding.`
          setReviewText('Running review...')
          reviewModal.onOpen()
          useModelStore.getState().executePrompt({ prompt, response_format: { zodObject: schema, name: 'review' } }).then((res) => {
              const parsed = res.parsed as { issues: ReviewIssue[] } | undefined
            console.log('Review result:', parsed)
            console.log('Number of issues:', parsed?.issues?.length || 0)
              if (parsed && parsed.issues && parsed.issues.length > 0) {
              setReviewText(JSON.stringify(parsed, null, 2))
              setParsedIssues(parsed.issues)
              if (parsed.issues.length < 10) {
                console.warn('⚠️ WARNING: Only', parsed.issues.length, 'issues returned (expected 10+)')
              }
            } else {
              setReviewText(res.result)
            }
          })
        }}>Run Review</Button>
      </div>
      <div style={{flex: 1, position: 'relative'}}>
        <TextoshopInterface centerMain={false} />
        
        {/* Review cards positioned next to translation field */}
        {parsedIssues.length > 0 && issuePositions.length > 0 && (() => {
          const trEl = document.getElementById('translationField')
          if (!trEl) return null
          
          const trRect = trEl.getBoundingClientRect()
          const cardWidth = 300
          const cardMinGap = 16 // Increased from 8 to 16 for better spacing
          const cardLeft = trRect.right + 16
          
          // Calculate non-overlapping positions
          const adjustedPositions: number[] = []
          let lastBottom = 0
          
          issuePositions.forEach((pos, idx) => {
            if (!pos || pos.top === 0) {
              adjustedPositions.push(0)
              return
            }
            
            let desiredTop = trRect.top + pos.top - trEl.scrollTop
            
            // Ensure minimum gap between cards
            if (adjustedPositions.length > 0 && desiredTop < lastBottom + cardMinGap) {
              desiredTop = lastBottom + cardMinGap
            }
            
            adjustedPositions.push(desiredTop)
            
            // More accurate card height estimation
            const issue = parsedIssues[idx]
            const baseHeight = 80 // Base height for category, severity, message
            const messageLines = Math.ceil((issue.message?.length || 0) / 50) // Approximate lines
            const messageHeight = messageLines * 20
            const suggestionHeight = issue.suggestion ? 70 + Math.ceil((issue.suggestion.length || 0) / 55) * 16 : 0
            const textHeight = issue.text ? 30 : 0
            const estimatedHeight = baseHeight + messageHeight + suggestionHeight + textHeight
            
            lastBottom = desiredTop + estimatedHeight
          })
          
          return (
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          {parsedIssues.map((iss, idx) => {
                const cardTop = adjustedPositions[idx]
                if (cardTop === 0) return null
                
            const color = CATEGORY_COLOR[iss.category] || 'rgba(255,196,0,0.45)'
                const solidColor = color.replace('0.35', '1')
                
            return (
                  <div 
                    key={idx}
                    style={{ 
                      position: 'absolute', 
                      left: cardLeft, 
                      top: cardTop,
                      width: cardWidth,
                      background: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderLeft: `4px solid ${solidColor}`,
                      borderRadius: 8, 
                      padding: 12,
                      marginBottom: 8, // Add explicit margin
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    onClick={() => scrollToIssue(iss)}
                  >
                    <div style={{ fontSize: 12, color: '#374151' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{iss.category}{iss.subcategory ? `/${iss.subcategory}` : ''}</span>
                        <span style={{ 
                          fontSize: 10, 
                          fontWeight: 600,
                          color: iss.severity === 'high' ? '#dc2626' : iss.severity === 'medium' ? '#f59e0b' : '#10b981',
                          textTransform: 'uppercase'
                        }}>{iss.severity}</span>
                  </div>
                      <div style={{ marginBottom: 8, lineHeight: 1.4 }}>{iss.message}</div>
                      {iss.suggestion && (
                        <div style={{ marginTop: 8, padding: 8, background: '#f9fafb', borderRadius: 4, fontSize: 11, lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, color: '#059669' }}>💡 Suggestion:</span>
                          <div style={{ marginTop: 4 }}>{iss.suggestion}</div>
                        </div>
                      )}
                      {iss.text && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.3 }}>
                          "{iss.text.length > 60 ? iss.text.substring(0, 60) + '...' : iss.text}"
                        </div>
                      )}
                </div>
              </div>
            )
          })}
        </div>
          )
        })()}
      </div>
      <Modal isOpen={reviewModal.isOpen} onClose={reviewModal.onClose} size='4xl' backdrop='opaque' style={{ zIndex: 1000000 }} classNames={{ wrapper: 'z-[1000000]', base: 'z-[1000001]', backdrop: 'z-[1000000]' }}>
        <ModalContent>
          <ModalHeader>Review Result</ModalHeader>
          <ModalBody>
            <Textarea value={reviewText} minRows={20} onChange={() => {}} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}


