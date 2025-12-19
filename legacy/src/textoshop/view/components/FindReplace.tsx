import { Button, Card, CardBody, CardHeader, Divider, Input, Switch } from '@nextui-org/react'
import { useEffect, useMemo, useState } from 'react'
import { textFieldEditors, useModelStore } from '../../model/Model'
import { Editor, Node, Path, Range, Transforms } from 'slate'

export default function FindReplace() {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [matches, setMatches] = useState<{ start: number, end: number }[]>([])
  const [active, setActive] = useState(false)

  const editor = textFieldEditors['translationField']

  useEffect(() => {
    if (!editor) return
    // Clear previous find marks
    Transforms.unsetNodes(editor as any, ['selection','selectionId','selectionClassname','selectionTooltip','selectionColor'], { at: [], mode: 'all', match: (n: any) => n.selectionClassname === 'findMatch' })
    if (!active || find.length === 0) return
    const text = Node.string(editor as any)
    const needle = caseSensitive ? find : find.toLowerCase()
    const hay = caseSensitive ? text : text.toLowerCase()
    const ranges: { start: number, end: number }[] = []
    let idx = 0
    const boundary = (s: string, i: number) => {
      const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
      const left = i === 0 ? ' ' : s[i-1]
      const right = i+find.length >= s.length ? ' ' : s[i+find.length]
      return !isWord(left) && !isWord(right)
    }
    while (idx < hay.length) {
      const at = hay.indexOf(needle, idx)
      if (at === -1) break
      if (!wholeWord || boundary(hay, at)) {
        ranges.push({ start: at, end: at + find.length })
      }
      idx = at + Math.max(find.length, 1)
    }
    setMatches(ranges)
    // Apply highlight
    let id = 0
    for (const r of ranges) {
      const anchor = (Editor as any).point(editor, { path: [0,0], offset: 0 })
      const start = anchor ? r.start : r.start
      const end = r.end
      const a = (Editor as any).after(editor, [], { distance: start, unit: 'character' })
      const b = (Editor as any).after(editor, [], { distance: end, unit: 'character' })
      if (a && b) {
        ;(editor as any).selection = { anchor: a, focus: b }
        ;(editor as any).addMark('selection', true)
        ;(editor as any).addMark('selectionId', id++)
        ;(editor as any).addMark('selectionClassname', 'findMatch')
        ;(editor as any).addMark('selectionColor', 'rgba(59, 130, 246, 0.25)')
        ;(editor as any).addMark('selectionTooltip', `Find match`)
        ;(editor as any).deselect()
      }
    }
    ;(editor as any).onChange()
  }, [find, caseSensitive, wholeWord, active, editor])

  const doReplaceOne = () => {
    if (!editor || matches.length === 0) return
    const m = matches[0]
    const a = (Editor as any).after(editor, [], { distance: m.start, unit: 'character' })
    const b = (Editor as any).after(editor, [], { distance: m.end, unit: 'character' })
    if (a && b) {
      Transforms.select(editor as any, { anchor: a, focus: b })
      Transforms.insertText(editor as any, replace)
      ;(editor as any).deselect()
      // retrigger search
      setMatches([])
      setTimeout(() => setActive(a => a), 0)
    }
  }

  const doReplaceAll = () => {
    if (!editor || matches.length === 0) return
    // Replace from last to first to preserve indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      const a = (Editor as any).after(editor, [], { distance: m.start, unit: 'character' })
      const b = (Editor as any).after(editor, [], { distance: m.end, unit: 'character' })
      if (a && b) {
        Transforms.select(editor as any, { anchor: a, focus: b })
        Transforms.insertText(editor as any, replace)
      }
    }
    ;(editor as any).deselect()
    setMatches([])
    setTimeout(() => setActive(a => a), 0)
  }

  return (
    <Card className='drop-shadow-md' style={{ background: 'white', borderRadius: 14 }}>
      <CardHeader>
        <span style={{ fontWeight: 600 }}>Find & Replace</span>
      </CardHeader>
      <Divider />
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Switch isSelected={active} onValueChange={setActive}>Enable</Switch>
          <Input isDisabled={!active} label='Find' size='sm' value={find} onValueChange={setFind} />
          <Input isDisabled={!active} label='Replace' size='sm' value={replace} onValueChange={setReplace} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Switch isDisabled={!active} isSelected={caseSensitive} onValueChange={setCaseSensitive}>Case sensitive</Switch>
            <Switch isDisabled={!active} isSelected={wholeWord} onValueChange={setWholeWord}>Whole word</Switch>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button size='sm' isDisabled={!active || find.length === 0 || matches.length === 0} onClick={doReplaceOne}>Replace</Button>
            <Button size='sm' isDisabled={!active || find.length === 0 || matches.length === 0} onClick={doReplaceAll}>Replace All</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}



