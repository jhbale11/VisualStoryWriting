import { Button, Card, CardBody, CardHeader, Divider, Input, Switch } from '@nextui-org/react'
import { useEffect, useState } from 'react'
import { textFieldEditors, useModelStore } from '../../model/Model'
import { Node, Transforms } from 'slate'
import { SlateUtils } from '../../model/utils/SlateUtils'

export default function FindReplace() {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matches, setMatches] = useState<{ start: number, end: number }[]>([])
  const [active, setActive] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const editor = textFieldEditors['translationField']

  useEffect(() => {
    if (!editor) return
    // Clear previous find marks
    try {
      Transforms.unsetNodes(editor as any, ['selection','selectionId','selectionClassname','selectionTooltip','selectionColor'], { 
        at: [], 
        mode: 'all', 
        match: (n: any) => n.selectionClassname === 'findMatch' 
      })
    } catch (e) {
      console.warn('[FindReplace] Failed to clear marks:', e);
    }
    
    if (!active || find.length === 0) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    
    try {
      const text = Node.string(editor as any)
      const ranges: { start: number, end: number }[] = []
      
      if (useRegex) {
        // Regex mode
        try {
          const flags = caseSensitive ? 'g' : 'gi'
          const regex = new RegExp(find, flags)
          let match
          while ((match = regex.exec(text)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length })
          }
        } catch (e) {
          console.warn('[FindReplace] Invalid regex:', e);
          setMatches([]);
          return;
        }
      } else {
        // Simple text search
        const needle = caseSensitive ? find : find.toLowerCase()
        const hay = caseSensitive ? text : text.toLowerCase()
        const boundary = (s: string, i: number) => {
          const isWord = (ch: string) => /[A-Za-z0-9_가-힣]/.test(ch)
          const left = i === 0 ? ' ' : s[i-1]
          const right = i+find.length >= s.length ? ' ' : s[i+find.length]
          return !isWord(left) && !isWord(right)
        }
        
        let idx = 0
        while (idx < hay.length) {
          const at = hay.indexOf(needle, idx)
          if (at === -1) break
          if (!wholeWord || boundary(hay, at)) {
            ranges.push({ start: at, end: at + find.length })
          }
          idx = at + Math.max(find.length, 1)
        }
      }
      
      setMatches(ranges)
      setCurrentMatchIndex(0)
      
      // Apply highlight using SlateUtils for better reliability
      const state = editor.children as any
      ranges.forEach((r, idx) => {
        const anchorPoint = SlateUtils.toSlatePoint(state, r.start)
        const focusPoint = SlateUtils.toSlatePoint(state, r.end)
        
        if (anchorPoint && focusPoint) {
          try {
            Transforms.select(editor as any, { anchor: anchorPoint, focus: focusPoint })
            ;(editor as any).addMark('selection', true)
            ;(editor as any).addMark('selectionId', idx)
            ;(editor as any).addMark('selectionClassname', 'findMatch')
            ;(editor as any).addMark('selectionColor', idx === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.25)')
            ;(editor as any).addMark('selectionTooltip', `Match ${idx + 1}/${ranges.length}`)
          } catch (e) {
            console.warn('[FindReplace] Failed to mark range:', e);
          }
        }
      })
      
      ;(editor as any).deselect()
      // Don't call onChange() as it triggers infinite loop
    } catch (e) {
      console.error('[FindReplace] Search failed:', e);
      setMatches([]);
    }
  }, [find, caseSensitive, wholeWord, useRegex, active, editor, refreshTrigger])

  // Update highlight when current match index changes
  useEffect(() => {
    if (!editor || matches.length === 0) return
    
    try {
      const state = editor.children as any
      // Re-apply highlights with current match emphasized
      matches.forEach((r, idx) => {
        const anchorPoint = SlateUtils.toSlatePoint(state, r.start)
        const focusPoint = SlateUtils.toSlatePoint(state, r.end)
        
        if (anchorPoint && focusPoint) {
          try {
            Transforms.select(editor as any, { anchor: anchorPoint, focus: focusPoint })
            const isCurrent = idx === currentMatchIndex
            ;(editor as any).addMark('selectionColor', isCurrent ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.25)')
          } catch (e) {
            // Ignore errors
          }
        }
      })
      ;(editor as any).deselect()
    } catch (e) {
      console.warn('[FindReplace] Failed to update highlight:', e);
    }
  }, [currentMatchIndex, matches, editor])

  const doReplaceOne = () => {
    if (!editor || matches.length === 0) return
    try {
      const state = editor.children as any
      const m = matches[currentMatchIndex]
      const anchorPoint = SlateUtils.toSlatePoint(state, m.start)
      const focusPoint = SlateUtils.toSlatePoint(state, m.end)
      
      if (anchorPoint && focusPoint) {
        Transforms.select(editor as any, { anchor: anchorPoint, focus: focusPoint })
        Transforms.insertText(editor as any, replace)
        ;(editor as any).deselect()
        // Trigger refresh to update matches
        setTimeout(() => setRefreshTrigger(t => t + 1), 100)
      }
    } catch (e) {
      console.error('[FindReplace] Replace one failed:', e);
      alert('Failed to replace. Please try again.');
    }
  }

  const doReplaceAll = () => {
    if (!editor || matches.length === 0) return
    try {
      const state = editor.children as any
      // Replace from last to first to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i]
        const anchorPoint = SlateUtils.toSlatePoint(state, m.start)
        const focusPoint = SlateUtils.toSlatePoint(state, m.end)
        
        if (anchorPoint && focusPoint) {
          Transforms.select(editor as any, { anchor: anchorPoint, focus: focusPoint })
          Transforms.insertText(editor as any, replace)
        }
      }
      ;(editor as any).deselect()
      // Trigger refresh to update matches
      setTimeout(() => setRefreshTrigger(t => t + 1), 100)
    } catch (e) {
      console.error('[FindReplace] Replace all failed:', e);
      alert('Failed to replace all. Please try again.');
    }
  }

  const goToNextMatch = () => {
    if (matches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIndex)
  }

  const goToPrevMatch = () => {
    if (matches.length === 0) return
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length
    setCurrentMatchIndex(prevIndex)
  }

  return (
    <Card className='drop-shadow-md' style={{ background: 'white', borderRadius: 14, minWidth: 280 }}>
      <CardHeader>
        <span style={{ fontWeight: 600 }}>Find & Replace</span>
      </CardHeader>
      <Divider />
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Switch isSelected={active} onValueChange={setActive} size="sm">Enable</Switch>
          <Input 
            isDisabled={!active} 
            label='Find' 
            size='sm' 
            value={find} 
            onValueChange={setFind}
            description={matches.length > 0 ? `${matches.length} matches found` : ''}
          />
          <Input 
            isDisabled={!active} 
            label='Replace with' 
            size='sm' 
            value={replace} 
            onValueChange={setReplace} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Switch isDisabled={!active} size="sm" isSelected={caseSensitive} onValueChange={setCaseSensitive}>
              Case sensitive
            </Switch>
            <Switch isDisabled={!active} size="sm" isSelected={wholeWord} onValueChange={setWholeWord}>
              Whole word
            </Switch>
            <Switch isDisabled={!active} size="sm" isSelected={useRegex} onValueChange={setUseRegex}>
              Regex
            </Switch>
          </div>
          {matches.length > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
              <span>{currentMatchIndex + 1} / {matches.length}</span>
              <Button size='sm' variant="flat" isDisabled={!active || matches.length === 0} onClick={goToPrevMatch}>
                ↑
              </Button>
              <Button size='sm' variant="flat" isDisabled={!active || matches.length === 0} onClick={goToNextMatch}>
                ↓
              </Button>
            </div>
          )}
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Button 
              size='sm' 
              color="primary"
              variant="flat"
              isDisabled={!active || find.length === 0 || matches.length === 0} 
              onClick={doReplaceOne}
            >
              Replace Current
            </Button>
            <Button 
              size='sm' 
              color="warning"
              isDisabled={!active || find.length === 0 || matches.length === 0} 
              onClick={doReplaceAll}
            >
              Replace All ({matches.length})
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}



