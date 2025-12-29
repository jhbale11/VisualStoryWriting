import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Divider, Modal, ModalBody, ModalContent, ModalHeader, Textarea, useDisclosure } from '@nextui-org/react';
import { Editor, Transforms, Node as SlateNode } from 'slate';
import { ReactEditor } from 'slate-react';
import { z } from 'zod';
import { textFieldEditors, useModelStore } from './model/Model';
import { SlateUtils } from './model/utils/SlateUtils';
import EditableTextField from './view/components/EditableTextField';
import { Toolbar } from './view/components/Toolbar';
import { TonePicker } from './view/components/TonePicker';
import FindReplace from './view/components/FindReplace';
import { PromptBox } from './view/components/PromptBox';
import DragnDrop from './view/components/DragnDrop';
import { useViewModelStore, DraggingParameters } from './model/ViewModel';
import { RangeUtils } from './view/components/TextSelection';
import { Utils } from './view/Utils';
import { TextMergerMenu } from './view/components/TextMergerMenu';
import { Popover, PopoverContent, PopoverTrigger, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@nextui-org/react';
import { MdContentCopy, MdContentCut, MdContentPaste } from 'react-icons/md';
import { CgArrowsBreakeH, CgArrowsMergeAltH } from 'react-icons/cg';
import { TextConsolidater } from './model/tools/promptTools/TextConsolidater';
import { TextDistributer } from './model/tools/promptTools/TextDistributer';
import { useUndoModelStore } from './model/UndoModel';
import { renderToString } from 'react-dom/server';
import './index.css';

import type { ParagraphMatchResult } from '../../translation/types';
import { browserStorage } from '../../translation/services/BrowserStorage';

interface TranslationReviewInterfaceProps {
  projectId: string;
  chunkId: string;
  koreanText: string;
  englishText: string;
  paragraphMatches?: ParagraphMatchResult;
  initialReviewIssues?: ReviewIssue[];
  onSave: (updatedEnglish: string, updatedMatches?: ParagraphMatchResult) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onRetranslate?: () => void;
  isRetranslating?: boolean;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  chunkIndex: number;
  totalChunks: number;
}

const CATEGORY_COLOR: { [k: string]: string } = {
  Accuracy: 'rgba(239, 68, 68, 0.35)', // red
  Fluency: 'rgba(59, 130, 246, 0.35)', // blue
  Terminology: 'rgba(16, 185, 129, 0.35)', // emerald
  Consistency: 'rgba(245, 158, 11, 0.35)', // amber
  Style: 'rgba(168, 85, 247, 0.35)', // purple
  Localization: 'rgba(234, 88, 12, 0.35)', // orange
};

type Severity = 'high' | 'medium' | 'low';
interface ReviewIssue {
  start?: number;
  end?: number;
  text?: string;
  category: string;
  subcategory?: string;
  severity: Severity;
  message: string;
  suggestion?: string;
}

const PARAGRAPH_SPLIT_REGEX = /\n\n+/;
const DEBUG_MATCHING = false; // Set true for verbose matching layout logs

const normalizeParagraphBreaks = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
};

const splitTextIntoParagraphs = (text: string): string[] => {
  if (!text) {
    return [];
  }
  return text
    .split(PARAGRAPH_SPLIT_REGEX)
    .filter(para => para.length > 0);
};

const computeParagraphRanges = (text: string, paragraphs: string[]): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];
  let searchIndex = 0;
  for (const para of paragraphs) {
    const start = text.indexOf(para, searchIndex);
    if (start < 0) {
      ranges.push({ start: -1, end: -1 });
      continue;
    }
    const end = start + para.length;
    ranges.push({ start, end });
    const delimiterMatch = text.slice(end).match(/^\n\n+/);
    searchIndex = end + (delimiterMatch ? delimiterMatch[0].length : 0);
  }
  return ranges;
};

const normalizeParagraph = (text: string): string => text.replace(/\s+/g, ' ').trim();

// Fallback: ensure Korean text is never hidden even if matching fails or is absent.
const buildFallbackMatches = (koreanText: string, englishCount: number): ParagraphMatchResult => {
  const koParas = splitTextIntoParagraphs(normalizeParagraphBreaks(koreanText));
  const aligned: string[] = new Array(Math.max(englishCount, 1)).fill('');
  const limit = Math.min(englishCount, koParas.length);
  for (let i = 0; i < limit; i++) {
    aligned[i] = koParas[i];
  }
  const remaining = koParas.slice(limit);
  const unmatchedKorean = remaining.length > 0
    ? [{ beforeEnglishIndex: englishCount, text: remaining.join('\n\n') }]
    : [];
  const matches = aligned.map((_, idx) => ({ englishIndex: idx, koreanIndex: idx }));
  return {
    englishParagraphs: new Array(Math.max(englishCount, 1)).fill(''),
    koreanParagraphs: aligned,
    unmatchedKorean,
    matches,
  };
};

// NOTE: buildParagraphAnchors/assignGapMappings were used by an older remap strategy.
// We now remap using containment heuristics so merged paragraphs preserve KR slices.

const remapParagraphMatches = (
  matchResult: ParagraphMatchResult,
  updatedEnglish: string
): ParagraphMatchResult => {
  const newEnglishParagraphs = splitTextIntoParagraphs(updatedEnglish);
  const baseEnglishParagraphs = matchResult.englishParagraphs && matchResult.englishParagraphs.length > 0
    ? matchResult.englishParagraphs
    : newEnglishParagraphs;

  if (newEnglishParagraphs.length === 0) {
    return {
      englishParagraphs: [],
      koreanParagraphs: [],
      unmatchedKorean: matchResult.unmatchedKorean,
      matches: [],
    };
  }

  // Remap aligned Korean paragraphs in a way that preserves Korean content on EN merge
  // and avoids duplicating Korean content on EN split.
  //
  // - If EN paragraphs were merged: concatenate the corresponding old aligned KR slices.
  // - If EN paragraphs were split: keep the KR slice only on the FIRST resulting EN paragraph
  //   and leave subsequent split parts empty (so we can 표시: "EN exists but KR doesn't").
  const oldAligned = matchResult.koreanParagraphs || [];
  const oldNorm = baseEnglishParagraphs.map(normalizeParagraph);
  const newNorm = newEnglishParagraphs.map(normalizeParagraph);

  const paragraphMap: number[] = new Array(newEnglishParagraphs.length).fill(0);
  const newAligned: string[] = new Array(newEnglishParagraphs.length).fill('');
  const usedOldOnce = new Set<number>();

  for (let newIdx = 0; newIdx < newEnglishParagraphs.length; newIdx++) {
    const n = newNorm[newIdx];
    if (!n) {
      paragraphMap[newIdx] = Math.min(newIdx, Math.max(0, baseEnglishParagraphs.length - 1));
      continue;
    }

    // Find all old paragraphs whose text is contained within this new paragraph (merge case),
    // OR the old paragraph contains this new paragraph (split case).
    const hits: number[] = [];
    for (let oldIdx = 0; oldIdx < oldNorm.length; oldIdx++) {
      const o = oldNorm[oldIdx];
      if (!o) continue;
      if (n.includes(o) || o.includes(n)) {
        hits.push(oldIdx);
      }
    }

    if (hits.length === 0) {
      const fallbackOld = Math.min(newIdx, Math.max(0, oldNorm.length - 1));
      paragraphMap[newIdx] = fallbackOld;
      newAligned[newIdx] = oldAligned[fallbackOld] ?? '';
      continue;
    }

    // Keep order and avoid duplicates
    const uniqueHits = Array.from(new Set(hits)).sort((a, b) => a - b);
    paragraphMap[newIdx] = uniqueHits[0];

    if (uniqueHits.length === 1) {
      const oldIdx = uniqueHits[0];
      if (usedOldOnce.has(oldIdx)) {
        newAligned[newIdx] = '';
      } else {
        usedOldOnce.add(oldIdx);
        newAligned[newIdx] = oldAligned[oldIdx] ?? '';
      }
    } else {
      // Merge aligned KR slices for merged EN paragraph
      newAligned[newIdx] = uniqueHits
        .map(i => oldAligned[i] ?? '')
        .filter(s => s.trim().length > 0)
        .join('\n\n');
    }
  }

  // Remap unmatchedKorean insert positions using paragraphMap (newIdx -> oldIdx).
  const oldLen = baseEnglishParagraphs.length;
  const newLen = newEnglishParagraphs.length;
  const oldToNewBuckets: number[][] = Array.from({ length: oldLen + 1 }, () => []);
  paragraphMap.forEach((oldIdx, newIdx) => {
    if (oldIdx >= 0 && oldIdx < oldLen) {
      oldToNewBuckets[oldIdx].push(newIdx);
    }
  });
  const mapBeforePos = (beforeOld: number) => {
    if (beforeOld <= 0) return 0;
    if (beforeOld >= oldLen) return newLen;
    // find smallest newIdx whose mapped oldIdx >= beforeOld
    for (let newIdx = 0; newIdx < paragraphMap.length; newIdx++) {
      if (paragraphMap[newIdx] >= beforeOld) return newIdx;
    }
    return newLen;
  };
  const newUnmatched = (matchResult.unmatchedKorean || []).map(u => ({
    beforeEnglishIndex: mapBeforePos(u.beforeEnglishIndex),
    text: u.text,
  }));

  const newMatches = newEnglishParagraphs.map((_, idx) => ({ englishIndex: idx, koreanIndex: idx }));

  return {
    englishParagraphs: newEnglishParagraphs,
    koreanParagraphs: newAligned,
    unmatchedKorean: newUnmatched,
    matches: newMatches,
  };
};

// NOTE: english->korean paragraph mapping for the "immutable KR panel" mode was removed.
// Korean panel now follows EN layout and uses `effectiveMatches.koreanParagraphs` + `effectiveMatches.unmatchedKorean`.

const englishNodesToText = (nodes: any[] | undefined | null): string => {
  if (!nodes || !Array.isArray(nodes)) return '';
  const nodesText = nodes.map((node: any) => SlateNode.string(node));
  const rawText = nodesText.join('\n\n');
  return normalizeParagraphBreaks(rawText);
};

const getEditorPlainText = (): string => {
  const editor = textFieldEditors['translationField'];
  if (!editor || !Array.isArray(editor.children)) {
    return '';
  }
  return englishNodesToText(editor.children as any);
};

export default function TranslationReviewInterface(props: TranslationReviewInterfaceProps) {
  const selectedTool = useModelStore(state => state.getSelectedTool());
  const textFields = useModelStore(state => state.textFields);
  const selectedTexts = useModelStore(state => state.selectedTexts);
  const setSelectedTexts = useModelStore(state => state.setSelectedTexts);
  const sentenceHovered = useViewModelStore(state => state.sentenceHovered);
  const setSentenceHovered = useViewModelStore(state => state.setSentenceHovered);
  const canonicalEnglishText = useMemo(() => normalizeParagraphBreaks(props.englishText || ''), [props.englishText]);
  // Keep raw Korean for review prompt and inline display (matching output provides aligned Korean paragraphs)

  // Keep full Korean text for review prompt; aligned KR display is driven by paragraphMatches.

  // Track live English text while editing (split/merge/add) so Korean layout follows English immediately.
  const [englishTextLive, setEnglishTextLive] = useState<string>(canonicalEnglishText);
  const lastEnglishLiveRef = useRef<string>(canonicalEnglishText);

  useEffect(() => {
    // reset when chunk changes / prop changes
    setEnglishTextLive(canonicalEnglishText);
    lastEnglishLiveRef.current = canonicalEnglishText;
  }, [canonicalEnglishText, props.chunkId]);

  // Keep englishTextLive in sync with editor state immediately (no polling)
  useEffect(() => {
    const pushText = (stateNodes: any) => {
      const next = englishNodesToText(stateNodes as any);
      if (next === lastEnglishLiveRef.current) return;
      lastEnglishLiveRef.current = next;
      setEnglishTextLive(next);
    };

    const unsubscribe = useModelStore.subscribe((state) => {
      const tf = state.textFields.find(t => t.id === 'translationField');
      pushText(tf?.state);
    });
    // Fire once immediately with current state
    pushText(useModelStore.getState().textFields.find(tf => tf.id === 'translationField')?.state);
    return () => unsubscribe();
  }, [props.chunkId]);

  const englishParagraphsForLayout = useMemo(
    () => splitTextIntoParagraphs(englishTextLive),
    [englishTextLive]
  );

  const [draggedElementId, setDraggedElementId] = useState<string>('');
  const [elementDroppedTimestamp, setElementDroppedTimestamp] = useState<number>(0);
  const [textMergerMenuPos, setTextMergerMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [contextualMenuPosition, setContextualMenuPosition] = useState<{ x: number, y: number } | null>(null);

  const [reviewText, setReviewText] = useState('');
  const reviewModal = useDisclosure();
  const [parsedIssues, setParsedIssues] = useState<ReviewIssue[]>([]);
  const [issuePositions, setIssuePositions] = useState<{ top: number; left: number; textRect: DOMRect; anchored: boolean }[]>([]);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const reviewLoadedKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const autoSaveSignatureRef = useRef<string>('');
  const skipInitialAutoSaveRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Best-effort: derive stable start/end offsets so we can anchor cards even when the text changes a bit.
  // This is intentionally conservative (exact substring search only).
  const withIssueOffsets = (issues: ReviewIssue[], englishText: string): ReviewIssue[] => {
    if (!englishText || issues.length === 0) return issues;
    let cursor = 0;
    return issues.map((iss) => {
      if (typeof iss.start === 'number' && typeof iss.end === 'number' && iss.end > iss.start) {
        return iss;
      }
      if (!iss.text) return iss;
      let at = englishText.indexOf(iss.text, cursor);
      if (at < 0) at = englishText.indexOf(iss.text);
      if (at >= 0) {
        cursor = at + iss.text.length;
        return { ...iss, start: at, end: at + iss.text.length };
      }
      return iss;
    });
  };

  // localStorage key for backward-compatible fallback (active chunk only)
  const reviewStorageKey = `review_${props.projectId}_${props.chunkId}`;

  // Load saved review from IndexedDB (fallback to localStorage for legacy)
  useEffect(() => {
    let cancelled = false;
    // Prevent cross-chunk bleed: mark not loaded for this key synchronously.
    reviewLoadedKeyRef.current = null;
    setIsReviewLoaded(false);
    // Clear UI immediately for new chunk
    setParsedIssues([]);
    setIssuePositions([]);
    (async () => {
      try {
        const saved = await browserStorage.getReview(props.projectId, props.chunkId);
        if (cancelled) return;
        if (saved) {
          const textNow = getEditorPlainText();
          const seeded = textNow ? withIssueOffsets(saved as ReviewIssue[], textNow) : (saved as ReviewIssue[]);
          setParsedIssues(seeded);
          console.log(`[Review] ✅ Loaded ${saved.length} issues from IndexedDB for chunk ${props.chunkId}`);
        } else {
          // If no saved review exists, seed from workflow-produced issues (if any)
          if (props.initialReviewIssues && props.initialReviewIssues.length > 0) {
            const textNow = getEditorPlainText();
            const seeded = textNow ? withIssueOffsets(props.initialReviewIssues, textNow) : props.initialReviewIssues;
            setParsedIssues(seeded);
            console.log(`[Review] Seeded ${props.initialReviewIssues.length} issues from workflow for chunk ${props.chunkId}`);
          } else {
            setParsedIssues([]);
          }
          console.log(`[Review] No saved review found for chunk ${props.chunkId} in IndexedDB`);
        }
        // Clean up legacy localStorage entry for this chunk
        try { localStorage.removeItem(reviewStorageKey); } catch { /* ignore */ }
      } catch (e) {
        console.error('[Review] ❌ Failed to load review from IndexedDB, falling back to localStorage:', e);
        try {
          const savedReview = localStorage.getItem(reviewStorageKey);
          if (savedReview) {
            const parsed = JSON.parse(savedReview) as ReviewIssue[];
            if (!cancelled) {
              setParsedIssues(parsed);
              console.log(`[Review] ✅ Loaded ${parsed.length} issues from localStorage for chunk ${props.chunkId}`);
            }
          } else if (!cancelled) {
            setParsedIssues([]);
          }
        } catch (err) {
          console.error('[Review] ❌ Failed to load saved review from localStorage:', err);
          if (!cancelled) setParsedIssues([]);
        }
      } finally {
        if (!cancelled) {
          reviewLoadedKeyRef.current = reviewStorageKey;
          setIsReviewLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [reviewStorageKey, props.chunkId, props.projectId, props.initialReviewIssues]);

  // Save review to IndexedDB (fallback to localStorage) whenever parsedIssues changes
  useEffect(() => {
    if (!isReviewLoaded || reviewLoadedKeyRef.current !== reviewStorageKey) {
      console.log(`[Review] Skipping save - review not yet loaded for chunk ${props.chunkId}`);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (parsedIssues.length > 0) {
          await browserStorage.saveReview(props.projectId, props.chunkId, parsedIssues as any);
          if (cancelled) return;
          // Remove legacy localStorage copy to keep quota low
          try { localStorage.removeItem(reviewStorageKey); } catch { /* ignore */ }
          console.log(`[Review] ✅ Saved ${parsedIssues.length} issues to IndexedDB for chunk ${props.chunkId}`);
        } else {
          await browserStorage.deleteReview(props.projectId, props.chunkId);
          if (cancelled) return;
          try { localStorage.removeItem(reviewStorageKey); } catch { /* ignore */ }
          console.log(`[Review] 🗑️ Removed review entry for chunk ${props.chunkId} from IndexedDB/localStorage`);
        }
      } catch (e) {
        console.error('[Review] ❌ Failed to save review to IndexedDB, attempting localStorage fallback:', e);
        try {
          if (parsedIssues.length > 0) {
            localStorage.setItem(reviewStorageKey, JSON.stringify(parsedIssues));
          } else {
            localStorage.removeItem(reviewStorageKey);
          }
        } catch (err) {
          console.error('[Review] ❌ Failed to save review to localStorage fallback:', err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [parsedIssues, reviewStorageKey, props.chunkId, props.projectId, isReviewLoaded]);

  // Paragraph matching state
  const [matchingLines, setMatchingLines] = useState<Array<{ x1: number, y1: number, x2: number, y2: number, englishIndex: number, hasKorean: boolean }>>([]);
  const [activeEnglishParagraphIndex, setActiveEnglishParagraphIndex] = useState<number | null>(null);

  // Build usage maps so we can:
  // - draw arrows that reflect split/merge (multiple EN->one KO)
  // - highlight missing/unmapped Korean and show it inline in the English-layout Korean panel
  const effectiveMatches = useMemo(() => {
    if (!props.paragraphMatches) return undefined;
    if (props.paragraphMatches.englishParagraphs.length === englishParagraphsForLayout.length) {
      return props.paragraphMatches;
    }
    // If the user split/merged paragraphs but hasn't saved yet, keep the display aligned by remapping on the fly.
    return remapParagraphMatches(props.paragraphMatches, englishTextLive);
  }, [props.paragraphMatches, englishParagraphsForLayout.length, englishTextLive]);

  // Display-safe matches: if matching failed/missing, fall back to raw Korean so nothing is hidden.
  const displayMatches = useMemo(() => {
    if (effectiveMatches && (
      (effectiveMatches.koreanParagraphs && effectiveMatches.koreanParagraphs.some(k => (k || '').trim().length > 0)) ||
      (effectiveMatches.unmatchedKorean && effectiveMatches.unmatchedKorean.length > 0)
    )) {
      return effectiveMatches;
    }
    return buildFallbackMatches(props.koreanText, englishParagraphsForLayout.length);
  }, [effectiveMatches, props.koreanText, englishParagraphsForLayout.length]);

  const activeKoreanRowIndex = activeEnglishParagraphIndex;

  // Korean panel is English-layout aligned, but Korean content is sourced from fullKoreanParagraphs
  // and missing/unmapped Korean is inserted inline and highlighted (never omitted).

  // Update paragraph matching lines based on text content
  useEffect(() => {
    if (!displayMatches) {
      setMatchingLines([]);
      return;
    }
    const matchResult = displayMatches;

    const updateMatchingLines = () => {
      const background = document.getElementById('background');
      const transField = document.getElementById('translationField');
      const koreanPanel = document.getElementById('korean-panel');

      if (!background || !transField || !koreanPanel) return;

      const bgRect = background.getBoundingClientRect();
      const lines: Array<{ x1: number, y1: number, x2: number, y2: number, englishIndex: number, hasKorean: boolean }> = [];

      // Get Korean row anchors (one per EN paragraph row)
      const koreanRows = document.querySelectorAll('.korean-row-anchor');

      // IMPORTANT: Use the same "live" English text/paragraph list that drives the Korean panel rows.
      // This prevents drift where lines are computed from a slightly different paragraph split.
      const editor = textFieldEditors['translationField'];
      if (!editor) return;

      const englishText = englishTextLive;
      if (!englishText) {
        setMatchingLines([]);
        return;
      }

      const englishParagraphs = englishParagraphsForLayout;
      if (DEBUG_MATCHING) {
        console.log('Korean row anchors:', koreanRows.length);
        console.log('English paragraphs (by \\n\\n):', englishParagraphs.length);
        console.log('Originally matched:', matchResult?.matches.length || 0);
      }

      const paragraphRanges = computeParagraphRanges(englishText, englishParagraphs);
      const englishParaPositions: Array<{ top: number, height: number }> = [];
      const slateState = editor.children as any;

      paragraphRanges.forEach((range, i) => {
        if (range.start < 0) {
          return;
        }
        const anchor = SlateUtils.toSlatePoint(slateState, range.start);
        const focus = SlateUtils.toSlatePoint(slateState, range.end);
        if (anchor && focus) {
          try {
            const domRange = ReactEditor.toDOMRange(editor as any, { anchor, focus } as any);
            const rects = domRange.getClientRects();
            if (rects.length > 0) {
              const firstRect = rects[0];
              const lastRect = rects[rects.length - 1];
              englishParaPositions[i] = {
                top: firstRect.top,
                height: Math.max(lastRect.bottom - firstRect.top, firstRect.height)
              };
            }
          } catch (e) {
            console.log(`Error measuring paragraph ${i}:`, e);
          }
        }
      });

      if (DEBUG_MATCHING) {
        console.log('English paragraph positions found:', englishParaPositions.length);
      }

      const contentEditable = transField.querySelector('[contenteditable="true"]');
      if (!contentEditable) return;

      const koreanRowByEnglish = new Map<number, HTMLElement>();
      koreanRows.forEach((el) => {
        const node = el as HTMLElement;
        const raw = node.getAttribute('data-english-idx');
        if (!raw) return;
        const idx = Number(raw);
        if (!isNaN(idx)) koreanRowByEnglish.set(idx, node);
      });

      // Draw one line per EN paragraph row. If KR is missing for that row, draw a faint line.
      for (let enIdx = 0; enIdx < englishParagraphs.length; enIdx++) {
        const englishPos = englishParaPositions[enIdx];
        const koreanRow = koreanRowByEnglish.get(enIdx);
        if (!englishPos || !koreanRow) continue;
        const koreanRect = koreanRow.getBoundingClientRect();

        const x1 = koreanRect.right - bgRect.left;
        const y1 = (koreanRect.top + koreanRect.height / 2 - bgRect.top);
        const x2 = contentEditable.getBoundingClientRect().left - bgRect.left;
        const y2 = (englishPos.top + englishPos.height / 2 - bgRect.top);

        const hasKorean = ((matchResult?.koreanParagraphs || [])[enIdx] || '').trim().length > 0;
        lines.push({ x1, y1, x2, y2, englishIndex: enIdx, hasKorean });
      }

      if (DEBUG_MATCHING) {
        console.log('Matching lines drawn:', lines.length);
      }
      setMatchingLines(lines);
    };

    const timeoutId = window.setTimeout(updateMatchingLines, 300);

    window.addEventListener('resize', updateMatchingLines);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateMatchingLines);
    };
  }, [effectiveMatches, props.koreanText, englishTextLive, englishParagraphsForLayout]);

  // Track active English paragraph based on cursor position in text
  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = textFieldEditors['translationField'];
      if (!editor || !effectiveMatches) return;

      try {
        const { selection } = editor;
        if (!selection || !selection.anchor) {
          setActiveEnglishParagraphIndex(null);
          return;
        }

        const text = getEditorPlainText();
        if (!text) {
          setActiveEnglishParagraphIndex(null);
          return;
        }

        const anchorOffset = SlateUtils.toStrIndex(editor.children as any, selection.anchor);
        const paragraphs = splitTextIntoParagraphs(text);
        const ranges = computeParagraphRanges(text, paragraphs);

        // Split text by \n\n to find which paragraph the cursor is in
        let foundParaIndex = -1;

        ranges.forEach((range, idx) => {
          if (range.start >= 0 && anchorOffset >= range.start && anchorOffset <= range.end) {
            if (foundParaIndex === -1) {
              foundParaIndex = idx;
            }
          }
        });

        // Only highlight if within matched range
        const matchedCount = displayMatches.matches.length;
        if (foundParaIndex >= 0 && foundParaIndex < matchedCount) {
          setActiveEnglishParagraphIndex(foundParaIndex);
        } else {
          setActiveEnglishParagraphIndex(null);
        }
      } catch (error) {
        console.error('Error in handleSelectionChange:', error);
        setActiveEnglishParagraphIndex(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [displayMatches]);

  // Initialize the model with English text field only - only on mount or when chunk changes
  useEffect(() => {
    // Keep \n\n as actual text in a single paragraph
    // This prevents animation issues and keeps paragraph structure simple
    const englishState = [{
      //@ts-ignore
      type: 'paragraph',
      children: [{ text: canonicalEnglishText }]
    }];

    // Create layers with the actual project data
    useModelStore.setState({
      layers: [
        {
          id: '1',
          layer: {
            name: 'English',
            color: '#eef3ff',
            isVisible: true,
            state: englishState,
            modifications: {}
          },
          children: []
        },
        { id: '2', layer: { name: 'Scratch', color: '#fde68a', isVisible: false, modifications: {} }, children: [] }
      ] as any,
      textFields: [
        { id: 'translationField', x: 0, y: 0, width: 700, height: 0, isMoveable: true, isVisible: true, state: englishState },
      ] as any,
      selectedLayerId: 0,
      selectedTool: useModelStore.getState().selectedTool,
      selectedTexts: [], // Clear any previous selections
    });
    useModelStore.getState().refreshTextFields(true);

    // Setup layout
    let cleanup: (() => void) | undefined;
    const layout = () => {
      const koreanPanel = document.getElementById('korean-panel') as HTMLElement | null;
      const trId = 'translationField';
      const trEl = document.getElementById(trId) as HTMLElement | null;
      if (!koreanPanel || !trEl) return;

      const panelGap = 24;
      const reserveRight = 360;
      const maxWidth = Math.max(600, Math.min(780, Math.floor((window.innerWidth - reserveRight - panelGap * 3) / 2)));
      const top = 140;
      const totalPanelsWidth = maxWidth * 2 + panelGap;
      const leftStart = Math.max(20, Math.floor((window.innerWidth - reserveRight - totalPanelsWidth) / 2));
      const leftKorean = leftStart;
      const leftTrans = leftKorean + maxWidth + panelGap;

      // Position Korean panel - no fixed height, show all content
      koreanPanel.style.position = 'absolute';
      koreanPanel.style.left = leftKorean + 'px';
      koreanPanel.style.top = top + 'px';
      koreanPanel.style.width = maxWidth + 'px';
      koreanPanel.style.minHeight = '600px';

      // Position English field - no fixed height, show all content
      const englishHeight = Math.max(600, koreanPanel.scrollHeight);
      useModelStore.getState().setTextField(trId, { x: leftTrans, y: top, width: maxWidth, height: englishHeight });

      // Calculate issue positions after layout
      setTimeout(() => findIssuePositions(), 100);

      cleanup = () => { };
    };

    const id = window.setTimeout(layout, 0);
    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', onResize);
      if (cleanup) cleanup();
    };
  }, [props.chunkId]); // Only re-initialize when chunk changes, not when text changes

  // Keep translation field height in sync with live content to avoid overlay drift
  useEffect(() => {
    const trId = 'translationField';
    const adjustHeight = () => {
      const koreanPanel = document.getElementById('korean-panel') as HTMLElement | null;
      const trEl = document.getElementById(trId) as HTMLElement | null;
      if (!koreanPanel || !trEl) return;
      const tf = useModelStore.getState().textFields.find(t => t.id === trId);
      if (!tf) return;
      const englishHeight = Math.max(600, koreanPanel.scrollHeight, trEl.scrollHeight);
      if (englishHeight !== tf.height) {
        useModelStore.getState().setTextField(trId, { ...tf, height: englishHeight });
      }
    };

    const timeoutId = window.setTimeout(adjustHeight, 150);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => adjustHeight())
      : null;
    const kp = document.getElementById('korean-panel');
    if (kp && resizeObserver) resizeObserver.observe(kp);

    return () => {
      window.clearTimeout(timeoutId);
      resizeObserver?.disconnect();
    };
  }, [englishTextLive]);

  // Auto-save when external translation/matching results arrive (retranslate or paragraph match)
  useEffect(() => {
    const signature = `${canonicalEnglishText}||${JSON.stringify(props.paragraphMatches ?? null)}`;

    // Skip the very first run to avoid redundant save on initial mount
    if (skipInitialAutoSaveRef.current) {
      skipInitialAutoSaveRef.current = false;
      autoSaveSignatureRef.current = signature;
      return;
    }

    if (signature === autoSaveSignatureRef.current) return;

    const textForAutoSave = lastEnglishLiveRef.current || canonicalEnglishText || englishTextLive;
    if (!textForAutoSave && !props.paragraphMatches) {
      autoSaveSignatureRef.current = signature;
      return;
    }

    props.onSave(textForAutoSave, props.paragraphMatches);
    autoSaveSignatureRef.current = signature;
  }, [canonicalEnglishText, props.paragraphMatches, englishTextLive]);

  // Recalculate positions when issues change
  useEffect(() => {
    if (parsedIssues.length > 0) {
      const timer = setTimeout(() => findIssuePositions(), 150);
      return () => clearTimeout(timer);
    }
  }, [parsedIssues]);

  // Recalculate positions when English text changes (split/merge/edit can invalidate anchors)
  useEffect(() => {
    if (parsedIssues.length === 0) return;
    const timer = setTimeout(() => findIssuePositions(), 250);
    return () => clearTimeout(timer);
  }, [englishTextLive, parsedIssues.length]);

  // Update card positions on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (parsedIssues.length > 0 && issuePositions.length > 0) {
        // Force re-render to update card positions
        setIssuePositions(prev => [...prev]);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [parsedIssues, issuePositions]);

  // Setup keyboard shortcuts
  useEffect(() => {
    const keyDownListener = (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || (e.metaKey && !e.shiftKey))) {
        e.preventDefault();
        useUndoModelStore.getState().undo();
      }
      if ((e.key === "y" && e.ctrlKey) || (e.key === "z" && e.metaKey && e.shiftKey)) {
        e.preventDefault();
        useUndoModelStore.getState().redo();
      }
      if (e.key === "Escape") {
        setSelectedTexts([]);
      }
    };

    const keyUpListener = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedTexts.length === 0 && draggedElementId !== "" && document.activeElement === document.body) {
        useUndoModelStore.getState().storeUndoState();
        useModelStore.getState().removeTextField(draggedElementId);
        setDraggedElementId('');
      }
    };

    window.addEventListener('keyup', keyUpListener);
    window.addEventListener('keydown', keyDownListener);

    return () => {
      window.removeEventListener('keyup', keyUpListener);
      window.removeEventListener('keydown', keyDownListener);
    };
  }, [selectedTexts, draggedElementId, setSelectedTexts]);

  const updateHoveredSentence = (e: MouseEvent, force: boolean = false) => {
    if (e.target instanceof HTMLElement && (e.target.tagName === "SPAN" || e.target.hasAttribute("data-slate-node"))) {
      const textField = e.target.closest('.editableTextField');

      if (textField) {
        const isMoveable = textField.classList.contains('isMoveableTextField');
        const previousHoveredSentence = useViewModelStore.getState().sentenceHovered;

        let range: Range | null = null;
        let caretPosition: { offset: number, offsetNode: Node } | null = null;
        let sentenceRange: Range | null = null;
        let slateRange: any = null;

        const editor = textFieldEditors[textField.id];

        caretPosition = Utils.caretPositionFromPoint(e.clientX, e.clientY);

        if (caretPosition) {
          if (!force && previousHoveredSentence && previousHoveredSentence.caretPosition && caretPosition.offsetNode.isSameNode(previousHoveredSentence.caretPosition.offsetNode) && caretPosition.offset === previousHoveredSentence.caretPosition.offset) {
            return;
          }

          range = document.createRange();
          range.setStart(caretPosition.offsetNode, caretPosition.offset > 0 ? caretPosition.offset - 1 : caretPosition.offset);
          range.setEnd(caretPosition.offsetNode, caretPosition.offset === 0 ? caretPosition.offset + 1 : caretPosition.offset);

          if (!force && previousHoveredSentence && previousHoveredSentence.cursorRange !== null && previousHoveredSentence.cursorRange.toString() === range.toString()) {
            return;
          }
        }

        if (isMoveable) {
          const slateStartPoint = Editor.start(editor, []);
          const slateEndPoint = Editor.end(editor, []);
          slateRange = { anchor: slateStartPoint, focus: slateEndPoint };
          sentenceRange = ReactEditor.toDOMRange(editor, slateRange);
        } else if (range !== null) {
          sentenceRange = RangeUtils.getRangeSnappedToSentence(range);

          if (!force && previousHoveredSentence && previousHoveredSentence.textfieldId === textField.id && previousHoveredSentence.range.toString() === sentenceRange.toString()) {
            useViewModelStore.getState().setSentenceHovered({ ...previousHoveredSentence, cursorRange: range, caretPosition: caretPosition });
            return;
          }

          slateRange = ReactEditor.toSlateRange(editor, sentenceRange, { exactMatch: true, suppressThrow: true });

          if (slateRange === null) {
            const selectedText = e.target.closest('.selectedText');
            if (selectedText) {
              const nodes = Editor.nodes(editor, { at: [], mode: 'all', match: (n: any) => n.selectionId !== undefined });
              for (const [node, path] of nodes) {
                slateRange = { anchor: { path: path, offset: 0 }, focus: { path: path, offset: (node as any).text.length } };
                break;
              }
            }
          }
        }

        if (sentenceRange && slateRange) {
          useViewModelStore.getState().setSentenceHovered({
            cursorRange: range,
            slateRange: slateRange,
            caretPosition: caretPosition,
            range: sentenceRange,
            rects: [...sentenceRange.getClientRects()],
            textfieldId: textField.id,
            position: { x: e.clientX, y: e.clientY }
          });
          return;
        }
      }
    }
    setTextMergerMenuPos(null);
    setSentenceHovered(null);
  };

  const onTextFieldDragged = (e: MouseEvent) => {
    updateHoveredSentence(e);
  };

  const onTextFieldDraggingEnded = (e: MouseEvent, draggingParameters: DraggingParameters[]) => {
    const textFieldId = draggingParameters[0].elementId.startsWith("textField") ? draggingParameters[0].elementId : "textField" + draggingParameters[0].elementId;
    setDraggedElementId(textFieldId);
    setElementDroppedTimestamp(Date.now());
    const bg = document.getElementById('background');
    if (bg) {
      const rect = bg.getBoundingClientRect();
      setTextMergerMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setTextMergerMenuPos({ x: e.clientX, y: e.clientY });
    }
  };

  const sentenceHoveredRects = sentenceHovered ? sentenceHovered.rects : [];
  const characterHoveredRects = (sentenceHovered && sentenceHovered.cursorRange !== null) ? [...sentenceHovered.cursorRange.getClientRects()] : [];

  let cursor = "auto";
  if (selectedTool.isIconAsCursor()) {
    const toolCursorSvg = renderToString(selectedTool.getIcon());
    cursor = `url("data:image/svg+xml,${encodeURI(toolCursorSvg)}") ${selectedTool.getIconHotspot().x} ${selectedTool.getIconHotspot().y}, auto`;
  }

  const handleSave = () => {
    const editor = textFieldEditors['translationField'];
    if (editor) {
      const text = getEditorPlainText();
      if (!text) {
        console.log('No text to save');
        return;
      }

      console.log('=== Saving ===');
      console.log('Text length:', text.length);
      console.log('Contains \\n\\n:', text.includes('\n\n'));
      const paragraphCount = splitTextIntoParagraphs(text).length;
      console.log('Paragraph count:', paragraphCount);
      const updatedMatches = props.paragraphMatches ? remapParagraphMatches(props.paragraphMatches, text) : undefined;
      props.onSave(text, updatedMatches);
    }
  };

  const handleRunReview = () => {
    const ko = props.koreanText;
    const editor = textFieldEditors['translationField'];
    if (!editor) {
      console.error('No editor found for translationField');
      return;
    }

    const en = getEditorPlainText();

    console.log('=== Review Text Extraction ===');
    console.log('Korean text length:', ko.length);
    console.log('English text length:', en.length);
    console.log('Korean first 100 chars:', ko.substring(0, 100));
    console.log('English first 100 chars:', en.substring(0, 100));
    console.log('Korean last 100 chars:', ko.substring(Math.max(0, ko.length - 100)));
    console.log('English last 100 chars:', en.substring(Math.max(0, en.length - 100)));

    if (!en || en.trim().length === 0) {
      alert('No text to review');
      return;
    }

    const schema = z.object({
      issues: z.array(z.object({
        text: z.string(),
        category: z.string(),
        subcategory: z.string().optional(),
        severity: z.enum(['high', 'medium', 'low']),
        message: z.string(),
        suggestion: z.string().optional()
      }))
    });

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

REMEMBER: You MUST return AT LEAST 15 issues. Count them before responding.`;

    setReviewText('Running review...');
    reviewModal.onOpen();

    useModelStore.getState().executePrompt({
      prompt,
      model: 'gpt-5.1-2025-11-13',
      response_format: { zodObject: schema, name: 'review' }
    }).then((res) => {
      if (!isMountedRef.current) return;
      const parsed = res.parsed as { issues: ReviewIssue[] } | undefined;
      console.log('Review result:', parsed);
      console.log('Number of issues:', parsed?.issues?.length || 0);
      if (parsed && parsed.issues && parsed.issues.length > 0) {
        setReviewText(JSON.stringify(parsed, null, 2));
        // Precompute offsets so cards can anchor reliably.
        const withOffsets = withIssueOffsets(parsed.issues, en);
        setParsedIssues(withOffsets);
        if (parsed.issues.length < 10) {
          console.warn('⚠️ WARNING: Only', parsed.issues.length, 'issues returned (expected 10+)');
        }
      } else {
        setReviewText(res.result);
      }
    }).catch((err) => {
      console.error('Review prompt failed:', err);
      if (!isMountedRef.current) return;
      setReviewText(`Review failed: ${err?.message || String(err)}`);
      setParsedIssues([]);
    });
  };

  function findIssuePositions() {
    const editor = textFieldEditors['translationField'];
    if (!editor || parsedIssues.length === 0) return;

    const trEl = document.getElementById('translationField');
    if (!trEl) return;

    // Get the full text
    const text = getEditorPlainText();
    if (!text) return;

    const state = editor.children as any;
    const positions: { top: number; left: number; textRect: DOMRect; anchored: boolean }[] = [];

    for (const issue of parsedIssues) {
      let start = issue.start;
      let end = issue.end;
      if ((start === undefined || end === undefined) && issue.text) {
        const at = text.indexOf(issue.text);
        if (at >= 0) { start = at; end = at + issue.text.length; }
      }
      if (start === undefined || end === undefined) {
        positions.push({ top: 0, left: 0, textRect: new DOMRect(), anchored: false });
        continue;
      }

      const a = SlateUtils.toSlatePoint(state, start);
      const b = SlateUtils.toSlatePoint(state, end);

      if (a && b) {
        try {
          const domRange = ReactEditor.toDOMRange(editor as any, { anchor: a, focus: b } as any);
          const rect = domRange.getBoundingClientRect();
          const trRect = trEl.getBoundingClientRect();

          // Calculate position relative to the translation field container
          const relativeTop = rect.top - trRect.top + trEl.scrollTop;
          const relativeLeft = rect.right - trRect.left;

          positions.push({
            top: relativeTop,
            left: relativeLeft,
            textRect: rect,
            anchored: true
          });
        } catch {
          positions.push({ top: 0, left: 0, textRect: new DOMRect(), anchored: false });
        }
      } else {
        positions.push({ top: 0, left: 0, textRect: new DOMRect(), anchored: false });
      }
    }

    setIssuePositions(positions);
  }

  const scrollToIssue = (issue: ReviewIssue) => {
    const editor = textFieldEditors['translationField'];
    if (!editor) return;

    // Get the full text (already contains \n\n as actual text)
    const text = getEditorPlainText();
    if (!text) return;

    let start = issue.start;
    let end = issue.end;
    if ((start === undefined || end === undefined) && issue.text) {
      const hay = text;
      const at = hay.indexOf(issue.text);
      if (at >= 0) { start = at; end = at + issue.text.length; }
    }
    if (start === undefined || end === undefined) return;
    const state = editor.children as any;
    const a = SlateUtils.toSlatePoint(state, start);
    const b = SlateUtils.toSlatePoint(state, end);
    if (a && b) {
      Transforms.select(editor as any, { anchor: a, focus: b });
      ReactEditor.focus(editor as any);
      setTimeout(() => {
        try {
          const domRange = ReactEditor.toDOMRange(editor as any, { anchor: a, focus: b } as any);
          const rect = domRange.getBoundingClientRect();
          if (rect) {
            window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - 120), behavior: 'smooth' });
            const el = document.getElementById('translationField') as HTMLElement | null;
            el?.scrollIntoView({ block: 'nearest' });
          }
        } catch { }
      }, 0);
    }
  };

  // Render paragraph matching lines overlay
  const renderMatchingLines = () => {
    if (matchingLines.length === 0) return null;

    const background = document.getElementById('background');
    if (!background) return null;

    const bgRect = background.getBoundingClientRect();

    // Calculate total height needed
    const koreanPanel = document.getElementById('korean-panel');
    const transField = document.getElementById('translationField');
    const maxHeight = Math.max(
      koreanPanel?.scrollHeight || 0,
      transField?.scrollHeight || 0,
      bgRect.height
    );

    return (
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: bgRect.width,
          height: maxHeight,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {matchingLines.map((line, idx) => {
          const isActive = activeEnglishParagraphIndex === line.englishIndex;
          return (
            <line
              key={idx}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={isActive ? "#ff6b6b" : "#4a90e2"}
              strokeWidth={isActive ? "2.5" : "1.5"}
              strokeDasharray="5,5"
              opacity={isActive ? "0.9" : (line.hasKorean ? "0.55" : "0.25")}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F2EEF0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee', zIndex: 1000 }}>
        <span style={{ fontWeight: 700 }}>Chunk:</span>
        <span>{props.chunkIndex + 1} / {props.totalChunks}</span>
        <Divider orientation='vertical' />
        <Button size='sm' variant='flat' onClick={() => props.onNavigate('prev')} isDisabled={!props.canNavigatePrev}>
          Prev
        </Button>
        <Button size='sm' variant='flat' onClick={() => props.onNavigate('next')} isDisabled={!props.canNavigateNext}>
          Next
        </Button>
        <Divider orientation='vertical' />
        {props.onRetranslate && (
          <Button
            size='sm'
            color='warning'
            variant='flat'
            onClick={props.onRetranslate}
            isDisabled={props.isRetranslating}
            isLoading={props.isRetranslating}
          >
            {props.isRetranslating ? 'Retranslating...' : 'Retranslate'}
          </Button>
        )}
        <Button size='sm' color='secondary' onClick={handleRunReview}>
          Run Review
        </Button>
        {parsedIssues.length > 0 && (
          <>
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
            <Button
              size='sm'
              color='danger'
              variant='flat'
              onClick={() => {
                setParsedIssues([]);
                console.log(`[Review] Cleared review for chunk ${props.chunkId}`);
              }}
            >
              Clear Review
            </Button>
          </>
        )}
        <Button size='sm' color='primary' onClick={handleSave}>
          Save Changes
        </Button>
        {props.paragraphMatches && (
          <>
            <Divider orientation='vertical' />
            <span style={{ fontSize: 12, color: '#666' }}>
              {props.paragraphMatches.matches.length} paragraphs matched
            </span>
          </>
        )}
      </div>

      {/* Main editing area */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, position: 'relative', overflow: 'auto' }}>
        <div id="background" style={{ position: 'relative', display: 'flex', justifyContent: 'center', flexGrow: 4, cursor: cursor, minHeight: '100%' }}
          onMouseDown={(e) => {
            if (e.target instanceof HTMLElement && (e.target.id === "background" || e.target.id === "mainTextField")) {
              setSelectedTexts([]);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const bg = document.getElementById('background');
            if (bg) {
              const rect = bg.getBoundingClientRect();
              setContextualMenuPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            } else {
              setContextualMenuPosition({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          <DragnDrop onDragging={onTextFieldDragged} onDraggingEnd={onTextFieldDraggingEnded} />

          {/* Paragraph matching lines overlay */}
          {renderMatchingLines()}

          {/* Korean paragraphs (read-only) */}
          <div
            id="korean-panel"
            style={{
              position: 'absolute',
              background: 'white',
              borderRadius: 8,
              padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              userSelect: 'text',
              cursor: 'text',
            }}
          >
            {/* English-layout aligned Korean panel:
               - rows == current English paragraph count (split by \\n\\n)
               - KR text is sourced from paragraphMatches.koreanParagraphs (aligned to EN count)
               - KR-only content is inserted via unmatchedKorean (highlighted)
               - EN-only rows are shown as '(no Korean aligned)' */}
            {englishParagraphsForLayout.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: 14 }}>No English paragraphs found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {englishParagraphsForLayout.map((_, rowIdx) => {
                  const krAligned = displayMatches?.koreanParagraphs || [];
                  const krText = krAligned[rowIdx] ?? '';
                  const unmatched = (displayMatches?.unmatchedKorean || []).filter(u => u.beforeEnglishIndex === rowIdx);

                  const hasAligned = krText.trim().length > 0;
                  const isActive = activeKoreanRowIndex === rowIdx;
                  return (
                    <div
                      key={rowIdx}
                      className="korean-row-anchor"
                      data-english-idx={rowIdx}
                      style={{ minHeight: 12 }}
                    >
                      {/* Unmatched Korean inserted before this EN row */}
                      {unmatched.map((u, j) => (
                        <div
                          key={`unmatched-${rowIdx}-${j}`}
                          style={{
                            marginBottom: 10,
                            lineHeight: 1.8,
                            fontSize: 18,
                            letterSpacing: '0.05em',
                            color: '#1a1a1a',
                            background: 'rgba(251, 146, 60, 0.12)',
                            borderLeft: '3px solid #f97316',
                            paddingLeft: 8,
                            marginLeft: -8,
                            borderRadius: 6,
                            boxShadow: 'inset 0 0 0 1px rgba(249, 115, 22, 0.25)',
                          }}
                          title="UNMATCHED Korean (likely omitted in English)"
                        >
                          <div>{u.text}</div>
                        </div>
                      ))}

                      {/* Aligned Korean for this EN row */}
                      <div
                        style={{
                          lineHeight: 1.8,
                          fontSize: 18,
                          letterSpacing: '0.05em',
                          color: hasAligned ? '#1a1a1a' : '#9ca3af',
                          backgroundColor: isActive ? 'rgba(255, 107, 107, 0.10)' : 'transparent',
                          borderLeft: isActive ? '3px solid #ff6b6b' : '3px solid transparent',
                          paddingLeft: 8,
                          marginLeft: -8,
                          borderRadius: 6,
                        }}
                        title={hasAligned ? '' : 'No Korean aligned to this English paragraph (EN-only)'}
                      >
                        <div>{hasAligned ? krText : '(no Korean aligned)'}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Unmatched Korean after the last EN row */}
                {(displayMatches?.unmatchedKorean || [])
                  .filter(u => u.beforeEnglishIndex === englishParagraphsForLayout.length)
                  .map((u, j) => (
                    <div
                      key={`unmatched-tail-${j}`}
                      style={{
                        marginTop: 6,
                        lineHeight: 1.8,
                        fontSize: 18,
                        letterSpacing: '0.05em',
                        color: '#1a1a1a',
                        background: 'rgba(251, 146, 60, 0.12)',
                        borderLeft: '3px solid #f97316',
                        paddingLeft: 8,
                        marginLeft: -8,
                        borderRadius: 6,
                        boxShadow: 'inset 0 0 0 1px rgba(249, 115, 22, 0.25)',
                      }}
                      title="UNMATCHED Korean (likely omitted in English)"
                    >
                      <div>{u.text}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* English text field (editable) */}
          {textFields.length > 0 && textFields.map((textField, index) => {
            return <EditableTextField isMoveable={true} textField={textField} key={index} style={{ display: textField.isVisible ? 'block' : 'none', zIndex: (sentenceHovered !== null && sentenceHovered.textfieldId === textField.id) ? 4 : 99 }} />;
          })}

          {/* Review cards positioned next to translation field */}
          {parsedIssues.length > 0 && (() => {
            const trEl = document.getElementById('translationField');
            const bgEl = document.getElementById('background');
            if (!trEl || !bgEl) return null;

            const trRect = trEl.getBoundingClientRect();
            const bgRect = bgEl.getBoundingClientRect();
            const cardWidth = 300;
            const cardMinGap = 12; // Increased from 8 to 16 for better spacing

            // Calculate left position relative to the background container
            const cardLeft = trRect.right - bgRect.left + 16;

            // Calculate non-overlapping positions
            const adjustedPositions: number[] = [];
            let lastBottom = 0;

            for (let idx = 0; idx < parsedIssues.length; idx++) {
              const pos = issuePositions[idx];
              // Calculate top position relative to the background container
              // pos.top is relative to the translation field content (including scroll)
              // We want: (trRect.top + pos.top - trEl.scrollTop) - bgRect.top
              let desiredTop: number;

              const anchored = !!pos && pos.anchored;
              if (anchored) {
                desiredTop = (trRect.top + pos.top - trEl.scrollTop) - bgRect.top;
              } else {
                // Fallback: never drop cards. Stack unanchored cards after the last one.
                desiredTop = lastBottom + cardMinGap;
              }

              if (adjustedPositions.length > 0 && desiredTop < lastBottom + cardMinGap) {
                desiredTop = lastBottom + cardMinGap;
              }

              adjustedPositions.push(desiredTop);

              // More accurate card height estimation
              const issue = parsedIssues[idx];
              const baseHeight = 80;
              const messageLines = Math.ceil((issue.message?.length || 0) / 50);
              const messageHeight = messageLines * 20;
              const suggestionHeight = issue.suggestion ? 70 + Math.ceil((issue.suggestion.length || 0) / 55) * 16 : 0;
              const textHeight = issue.text ? 30 : 0;
              const estimatedHeight = baseHeight + messageHeight + suggestionHeight + textHeight;

              lastBottom = desiredTop + estimatedHeight;
            }

            return (
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {parsedIssues.map((iss, idx) => {
                  const cardTop = adjustedPositions[idx] ?? (lastBottom + cardMinGap + idx * 12);
                  const anchored = !!issuePositions[idx] && issuePositions[idx].anchored;

                  const color = CATEGORY_COLOR[iss.category] || 'rgba(255,196,0,0.45)';
                  const solidColor = color.replace('0.35', '1');

                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: cardLeft,
                        top: cardTop,
                        width: cardWidth,
                        background: anchored ? 'white' : '#fff7ed',
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
                  );
                })}
              </div>
            );
          })()}

          {sentenceHoveredRects.map((rect, index) => {
            return <div key={index} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, background: 'rgba(0, 0, 0, 0.1)', pointerEvents: 'none', zIndex: 5 }}></div>;
          })}

          {characterHoveredRects.map((rect, index) => {
            return <div key={index} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, background: 'rgba(255, 219, 88, 0.8)', pointerEvents: 'none', zIndex: 6 }}></div>;
          })}

          <PromptBox />

          {(textMergerMenuPos !== null && sentenceHoveredRects.length > 0) && <Popover offset={20} isOpen={textMergerMenuPos !== null} showArrow={true}
            shouldCloseOnInteractOutside={() => (Date.now() - elementDroppedTimestamp) > 200}
            onClose={() => { setTextMergerMenuPos(null); setSentenceHovered(null); }}>
            <PopoverTrigger>
              <div style={{ position: 'absolute', zIndex: 99999, left: textMergerMenuPos.x, top: textMergerMenuPos.y }}></div>
            </PopoverTrigger>
            <PopoverContent>
              <TextMergerMenu draggedElementId={draggedElementId} />
            </PopoverContent>
          </Popover>}

          {contextualMenuPosition !== null && <Dropdown
            onClose={() => setContextualMenuPosition(null)}
            isOpen={true}>
            <DropdownTrigger>
              <div style={{ position: 'absolute', left: contextualMenuPosition.x, top: contextualMenuPosition.y, width: 1, height: 1, background: 'red' }}>⋮
              </div>
            </DropdownTrigger>
            <DropdownMenu disabledKeys={selectedTexts.length === 0 ? ['cut', 'copy'] : []} variant="flat" aria-label="Dropdown menu with shortcut">
              {[
                <DropdownItem key="cut" shortcut="⌘X" startContent={<MdContentCut />} onClick={() => {
                  const selectedTexts = useModelStore.getState().selectedTexts;
                  if (selectedTexts.length > 0) {
                    const text = selectedTexts.map(t => t.text).join(" ");
                    navigator.clipboard.writeText(text);
                    useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, text: "", isLoading: false })));
                    useModelStore.getState().setSelectedTexts([]);
                  }
                }}>Cut</DropdownItem>,
                <DropdownItem key="copy" shortcut="⌘C" startContent={<MdContentCopy />} onClick={() => {
                  const selectedTexts = useModelStore.getState().selectedTexts;
                  if (selectedTexts.length > 0) {
                    const text = selectedTexts.map(t => t.text).join(" ");
                    navigator.clipboard.writeText(text);
                  }
                }}>Copy</DropdownItem>,
                <DropdownItem key="paste" shortcut="⌘V" startContent={<MdContentPaste />} showDivider={selectedTexts.length > 0} onClick={() => {
                  navigator.clipboard.readText().then(text => {
                    const selectedTexts = useModelStore.getState().selectedTexts;
                    if (selectedTexts.length > 0) {
                      const newSelection = selectedTexts.map(selectedText => ({ ...selectedText, text: text, isLoading: false }));
                      useModelStore.getState().setSelectedTexts(newSelection);
                      useModelStore.getState().setSelectedTexts([]);
                    }
                  });
                }}>Paste</DropdownItem>,
                <DropdownItem key="break" startContent={<CgArrowsBreakeH />} onClick={() => {
                  const selectedTexts = useModelStore.getState().selectedTexts;
                  if (selectedTexts.length > 0) {
                    useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, isLoading: true })));
                    new TextDistributer(selectedTexts[0].text).execute().then(result => {
                      useModelStore.getState().animateNextChanges();
                      useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, text: result, isLoading: false })));
                    });
                  }
                }}>Break into sentences</DropdownItem>,
                <DropdownItem key="merge" startContent={<CgArrowsMergeAltH />} onClick={() => {
                  const selectedTexts = useModelStore.getState().selectedTexts;
                  if (selectedTexts.length > 0) {
                    useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, isLoading: true })));
                    new TextConsolidater(selectedTexts[0].text).execute().then(result => {
                      useModelStore.getState().animateNextChanges();
                      useModelStore.getState().setSelectedTexts(selectedTexts.map(t => ({ ...t, text: result, isLoading: false })));
                    });
                  }
                }}>Merge into one sentence</DropdownItem>,
              ].slice(0, selectedTexts.length === 0 ? 3 : 5)}
            </DropdownMenu>
          </Dropdown>}
        </div>

        <Toolbar />

        <div id="rightPanel" style={{ position: 'fixed', right: 0, top: 60, paddingTop: 20, paddingRight: 20, paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 60px)', zIndex: 1000, overflow: 'auto' }}>
          <TonePicker />
          <FindReplace />
        </div>
      </div>

      {/* Review modal */}
      <Modal isOpen={reviewModal.isOpen} onClose={reviewModal.onClose} size='4xl' backdrop='opaque' style={{ zIndex: 1000000 }} classNames={{ wrapper: 'z-[1000000]', base: 'z-[1000001]', backdrop: 'z-[1000000]' }}>
        <ModalContent>
          <ModalHeader>Review Result</ModalHeader>
          <ModalBody>
            <Textarea value={reviewText} minRows={20} onChange={() => { }} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

