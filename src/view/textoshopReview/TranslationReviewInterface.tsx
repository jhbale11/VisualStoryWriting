import React, { useEffect, useState } from 'react';
import { Button, Divider, Select, SelectItem, Modal, ModalBody, ModalContent, ModalHeader, Textarea, useDisclosure } from '@nextui-org/react';
import { Editor, Transforms } from 'slate';
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

interface TranslationReviewInterfaceProps {
  projectId: string;
  chunkId: string;
  koreanText: string;
  englishText: string;
  paragraphMatches?: ParagraphMatchResult;
  onSave: (updatedEnglish: string) => void;
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

export default function TranslationReviewInterface(props: TranslationReviewInterfaceProps) {
  const selectedToolStr = useModelStore(state => state.selectedTool);
  const selectedTool = useModelStore(state => state.getSelectedTool());
  const textFields = useModelStore(state => state.textFields);
  const selectedTexts = useModelStore(state => state.selectedTexts);
  const setSelectedTexts = useModelStore(state => state.setSelectedTexts);
  const sentenceHovered = useViewModelStore(state => state.sentenceHovered);
  const setSentenceHovered = useViewModelStore(state => state.setSentenceHovered);
  
  const [draggedElementId, setDraggedElementId] = useState<string>('');
  const [elementDroppedTimestamp, setElementDroppedTimestamp] = useState<number>(0);
  const [textMergerMenuPos, setTextMergerMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [contextualMenuPosition, setContextualMenuPosition] = useState<{ x: number, y: number } | null>(null);
  
  const [reviewText, setReviewText] = useState('');
  const reviewModal = useDisclosure();
  const [parsedIssues, setParsedIssues] = useState<ReviewIssue[]>([]);
  const [issuePositions, setIssuePositions] = useState<{top: number, left: number, textRect: DOMRect}[]>([]);
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  
  // localStorage key for this chunk's review
  const reviewStorageKey = `review_${props.projectId}_${props.chunkId}`;
  
  // Load saved review from localStorage on mount or chunk change
  useEffect(() => {
    setIsReviewLoaded(false);
    try {
      const savedReview = localStorage.getItem(reviewStorageKey);
      console.log(`[Review] Attempting to load review from localStorage for chunk ${props.chunkId}`, savedReview ? `(${savedReview.length} chars)` : '(none)');
      if (savedReview) {
        const parsed = JSON.parse(savedReview) as ReviewIssue[];
        setParsedIssues(parsed);
        console.log(`[Review] ✅ Loaded ${parsed.length} issues from localStorage for chunk ${props.chunkId}`);
      } else {
        // Clear issues when switching to a chunk with no saved review
        setParsedIssues([]);
        console.log(`[Review] No saved review found for chunk ${props.chunkId}`);
      }
    } catch (e) {
      console.error('[Review] ❌ Failed to load saved review from localStorage:', e);
      setParsedIssues([]);
    }
    setIsReviewLoaded(true);
  }, [reviewStorageKey, props.chunkId]);
  
  // Save review to localStorage whenever parsedIssues changes (but only after initial load)
  useEffect(() => {
    if (!isReviewLoaded) {
      console.log(`[Review] Skipping save - review not yet loaded for chunk ${props.chunkId}`);
      return;
    }
    
    if (parsedIssues.length > 0) {
      try {
        localStorage.setItem(reviewStorageKey, JSON.stringify(parsedIssues));
        console.log(`[Review] ✅ Saved ${parsedIssues.length} issues to localStorage for chunk ${props.chunkId}`);
      } catch (e) {
        console.error('[Review] ❌ Failed to save review to localStorage:', e);
      }
    } else {
      // Remove from localStorage if no issues (but only if we've loaded already)
      try {
        localStorage.removeItem(reviewStorageKey);
        console.log(`[Review] 🗑️ Removed review from localStorage for chunk ${props.chunkId}`);
      } catch (e) {
        console.error('[Review] ❌ Failed to remove review from localStorage:', e);
      }
    }
  }, [parsedIssues, reviewStorageKey, props.chunkId, isReviewLoaded]);
  
  // Paragraph matching state
  const [matchingLines, setMatchingLines] = useState<Array<{x1: number, y1: number, x2: number, y2: number}>>([]);
  const [activeEnglishParagraphIndex, setActiveEnglishParagraphIndex] = useState<number | null>(null);
  
  // Get Korean paragraphs (either from paragraphMatches or split by \n\n)
  const koreanParagraphs = props.paragraphMatches 
    ? props.paragraphMatches.koreanParagraphs 
    : props.koreanText.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Update paragraph matching lines based on text content
  useEffect(() => {
    if (!props.paragraphMatches) {
      setMatchingLines([]);
      return;
    }

    const updateMatchingLines = () => {
      const background = document.getElementById('background');
      const transField = document.getElementById('translationField');
      const koreanPanel = document.getElementById('korean-panel');
      
      if (!background || !transField || !koreanPanel) return;

      const bgRect = background.getBoundingClientRect();
      const lines: Array<{x1: number, y1: number, x2: number, y2: number}> = [];

      // Get Korean paragraph elements
      const koreanParas = document.querySelectorAll('.korean-paragraph');
      
      // Get English text and split by \n\n to find paragraph positions
      const editor = textFieldEditors['translationField'];
      if (!editor) return;
      
      // Safely extract text from editor
      let englishText = '';
      try {
        // Get text from the first paragraph node
        if (editor.children && editor.children.length > 0) {
          const firstPara = editor.children[0] as any;
          if (firstPara && firstPara.children && firstPara.children.length > 0) {
            englishText = firstPara.children.map((child: any) => child.text || '').join('');
          }
        }
      } catch (e) {
        console.error('Error extracting text from editor:', e);
        return;
      }
      
      if (!englishText) {
        console.log('No text found in editor');
        return;
      }
      
      const englishParagraphs = englishText.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
      
      console.log('Korean paragraphs:', koreanParas.length);
      console.log('English paragraphs (by \\n\\n):', englishParagraphs.length);
      console.log('Originally matched:', props.paragraphMatches?.matches.length || 0);

      // Calculate English paragraph positions by measuring text ranges
      const englishParaPositions: Array<{top: number, height: number}> = [];
      
      // Get the contenteditable element
      const contentEditable = transField.querySelector('[contenteditable="true"]');
      if (!contentEditable) return;
      
      // Find the text node inside Slate editor
      const findTextNode = (node: Node): Text | null => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node as Text;
        }
        for (let i = 0; i < node.childNodes.length; i++) {
          const found = findTextNode(node.childNodes[i]);
          if (found) return found;
        }
        return null;
      };
      
      const textNode = findTextNode(contentEditable);
      if (!textNode || !textNode.textContent) {
        console.log('No text node found in editor');
        return;
      }
      
      // Use Range API to find paragraph positions in the text
      let currentPos = 0;
      for (let i = 0; i < englishParagraphs.length; i++) {
        const paraText = englishParagraphs[i];
        const paraStart = englishText.indexOf(paraText, currentPos);
        const paraEnd = paraStart + paraText.length;
        
        if (paraStart < 0) {
          console.log(`Paragraph ${i} not found in text`);
          continue;
        }
        
        try {
          const range = document.createRange();
          const startOffset = Math.min(paraStart, textNode.textContent.length);
          const endOffset = Math.min(paraEnd, textNode.textContent.length);
          
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, endOffset);
          
          const rects = range.getClientRects();
          if (rects.length > 0) {
            const firstRect = rects[0];
            const lastRect = rects[rects.length - 1];
            englishParaPositions.push({
              top: firstRect.top,
              height: lastRect.bottom - firstRect.top
            });
          } else {
            console.log(`No rects for paragraph ${i}`);
          }
        } catch (e) {
          console.log(`Error measuring paragraph ${i}:`, e);
        }
        
        currentPos = paraEnd;
      }

      console.log('English paragraph positions found:', englishParaPositions.length);

      // Draw lines for matched paragraphs only
      const matchedCount = Math.min(
        props.paragraphMatches?.matches.length || 0,
        koreanParas.length,
        englishParaPositions.length
      );

      for (let i = 0; i < matchedCount; i++) {
        const koreanPara = koreanParas[i] as HTMLElement;
        const englishPos = englishParaPositions[i];

        if (koreanPara && englishPos) {
          const koreanRect = koreanPara.getBoundingClientRect();

          const x1 = koreanRect.right - bgRect.left;
          const y1 = koreanRect.top + koreanRect.height / 2 - bgRect.top;
          const x2 = contentEditable.getBoundingClientRect().left - bgRect.left;
          const y2 = englishPos.top + englishPos.height / 2 - bgRect.top;

          lines.push({ x1, y1, x2, y2 });
        }
      }

      console.log('Matching lines drawn:', lines.length);
      setMatchingLines(lines);
    };

    const timeoutId = window.setTimeout(updateMatchingLines, 300);
    
    window.addEventListener('resize', updateMatchingLines);
    
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateMatchingLines);
    };
  }, [props.paragraphMatches, props.koreanText, props.englishText]);

  // Track active English paragraph based on cursor position in text
  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = textFieldEditors['translationField'];
      if (!editor || !props.paragraphMatches) return;

      try {
        const { selection } = editor;
        if (!selection || !selection.anchor) {
          setActiveEnglishParagraphIndex(null);
          return;
        }

        // Get text from editor safely
        let text = '';
        try {
          if (editor.children && editor.children.length > 0) {
            const firstPara = editor.children[0] as any;
            if (firstPara && firstPara.children && firstPara.children.length > 0) {
              text = firstPara.children.map((child: any) => child.text || '').join('');
            }
          }
        } catch (e) {
          console.error('Error extracting text:', e);
          setActiveEnglishParagraphIndex(null);
          return;
        }
        
        if (!text) {
          setActiveEnglishParagraphIndex(null);
          return;
        }
        
        const cursorOffset = selection.anchor.offset || 0;
        
        // Split text by \n\n to find which paragraph the cursor is in
        const paragraphs = text.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
        
        let currentPos = 0;
        let foundParaIndex = -1;
        
        for (let i = 0; i < paragraphs.length; i++) {
          const paraText = paragraphs[i];
          const paraStart = text.indexOf(paraText, currentPos);
          const paraEnd = paraStart + paraText.length;
          
          if (paraStart >= 0 && cursorOffset >= paraStart && cursorOffset <= paraEnd) {
            foundParaIndex = i;
            break;
          }
          
          currentPos = paraEnd;
        }
        
        // Only highlight if within matched range
        const matchedCount = props.paragraphMatches.matches.length;
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
  }, [props.paragraphMatches]);

  // Initialize the model with English text field only - only on mount or when chunk changes
  useEffect(() => {
    // Keep \n\n as actual text in a single paragraph
    // This prevents animation issues and keeps paragraph structure simple
    const englishState = [{
      //@ts-ignore
      type: 'paragraph',
      children: [{ text: props.englishText }]
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
      const maxWidth = Math.max(600, Math.min(780, Math.floor((window.innerWidth - reserveRight - panelGap*3) / 2)));
      const top = 140;
      const totalPanelsWidth = maxWidth*2 + panelGap;
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
      
      cleanup = () => {};
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

  // Recalculate positions when issues change
  useEffect(() => {
    if (parsedIssues.length > 0) {
      const timer = setTimeout(() => findIssuePositions(), 150);
      return () => clearTimeout(timer);
    }
  }, [parsedIssues]);

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
      // Get the full text (already contains \n\n as actual text)
      let text = '';
      try {
        if (editor.children && editor.children.length > 0) {
          const firstPara = editor.children[0] as any;
          if (firstPara && firstPara.children && firstPara.children.length > 0) {
            text = firstPara.children.map((child: any) => child.text || '').join('');
          }
        }
      } catch (e) {
        console.error('Error extracting text for save:', e);
        return;
      }
      
      console.log('=== Saving ===');
      console.log('Text length:', text.length);
      console.log('Contains \\n\\n:', text.includes('\n\n'));
      const paragraphCount = text.split(/\n\n+/).filter((p: string) => p.trim().length > 0).length;
      console.log('Paragraph count:', paragraphCount);
      props.onSave(text);
    }
  };

  const handleRunReview = () => {
    const ko = props.koreanText;
    const editor = textFieldEditors['translationField'];
    if (!editor) {
      console.error('No editor found for translationField');
      return;
    }
    
    // Get the full text (already contains \n\n as actual text)
    let en = '';
    try {
      if (editor.children && editor.children.length > 0) {
        // Extract text from all children, not just the first paragraph
        en = editor.children.map((node: any) => {
          if (node.children && node.children.length > 0) {
            return node.children.map((child: any) => child.text || '').join('');
          }
          return '';
        }).filter(t => t.length > 0).join('\n\n');
      }
    } catch (e) {
      console.error('Error extracting text for review:', e);
      return;
    }
    
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
        severity: z.enum(['high','medium','low']), 
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

REMEMBER: You MUST return AT LEAST 10 issues. Count them before responding.`;
    
    setReviewText('Running review...');
    reviewModal.onOpen();
    
    useModelStore.getState().executePrompt({ prompt, response_format: { zodObject: schema, name: 'review' } }).then((res) => {
      const parsed = res.parsed as { issues: ReviewIssue[] } | undefined;
      console.log('Review result:', parsed);
      console.log('Number of issues:', parsed?.issues?.length || 0);
      if (parsed && parsed.issues && parsed.issues.length > 0) {
        setReviewText(JSON.stringify(parsed, null, 2));
        setParsedIssues(parsed.issues);
        if (parsed.issues.length < 10) {
          console.warn('⚠️ WARNING: Only', parsed.issues.length, 'issues returned (expected 10+)');
        }
      } else {
        setReviewText(res.result);
      }
    });
  };

  function findIssuePositions() {
    const editor = textFieldEditors['translationField'];
    if (!editor || parsedIssues.length === 0) return;
    
    const trEl = document.getElementById('translationField');
    if (!trEl) return;

    // Get the full text
    let text = '';
    try {
      if (editor.children && editor.children.length > 0) {
        const firstPara = editor.children[0] as any;
        if (firstPara && firstPara.children && firstPara.children.length > 0) {
          text = firstPara.children.map((child: any) => child.text || '').join('');
        }
      }
    } catch (e) {
      console.error('Error extracting text:', e);
      return;
    }

    if (!text) return;

    const state = editor.children as any;
    const positions: {top: number, left: number, textRect: DOMRect}[] = [];

    for (const issue of parsedIssues) {
      let start = issue.start;
      let end = issue.end;
      if ((start === undefined || end === undefined) && issue.text) {
        const at = text.indexOf(issue.text);
        if (at >= 0) { start = at; end = at + issue.text.length; }
      }
      if (start === undefined || end === undefined) {
        positions.push({ top: 0, left: 0, textRect: new DOMRect() });
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
            textRect: rect
          });
        } catch {
          positions.push({ top: 0, left: 0, textRect: new DOMRect() });
        }
      } else {
        positions.push({ top: 0, left: 0, textRect: new DOMRect() });
      }
    }

    setIssuePositions(positions);
  }

  const scrollToIssue = (issue: ReviewIssue) => {
    const editor = textFieldEditors['translationField'];
    if (!editor) return;
    
    // Get the full text (already contains \n\n as actual text)
    let text = '';
    try {
      if (editor.children && editor.children.length > 0) {
        const firstPara = editor.children[0] as any;
        if (firstPara && firstPara.children && firstPara.children.length > 0) {
          text = firstPara.children.map((child: any) => child.text || '').join('');
        }
      }
    } catch (e) {
      console.error('Error extracting text for scrollToIssue:', e);
      return;
    }
    
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
        } catch {}
      }, 0);
    }
  };

  // Render paragraph matching lines overlay
  const renderMatchingLines = () => {
    if (!props.paragraphMatches || matchingLines.length === 0) return null;

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
          // Only highlight if the active paragraph is within matched range
          const isActive = activeEnglishParagraphIndex === idx;
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
              opacity={isActive ? "0.9" : "0.5"}
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
            {koreanParagraphs.map((para: string, idx: number) => {
              const isActive = activeEnglishParagraphIndex === idx;
              return (
                <div
                  key={idx}
                  className="korean-paragraph"
                  style={{
                    marginBottom: idx < koreanParagraphs.length - 1 ? 16 : 0,
                    lineHeight: 1.8,
                    fontSize: 17,
                    color: '#1a1a1a',
                    backgroundColor: isActive ? 'rgba(255, 107, 107, 0.1)' : 'transparent',
                    borderLeft: isActive ? '3px solid #ff6b6b' : '3px solid transparent',
                    paddingLeft: 8,
                    marginLeft: -8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {para}
                </div>
              );
            })}
          </div>
          
          {/* English text field (editable) */}
          {textFields.length > 0 && textFields.map((textField, index) => {
            return <EditableTextField isMoveable={true} textField={textField} key={index} style={{ display: textField.isVisible ? 'block' : 'none', zIndex: (sentenceHovered !== null && sentenceHovered.textfieldId === textField.id) ? 4 : 99 }} />;
          })}

          {/* Review cards positioned next to translation field */}
          {parsedIssues.length > 0 && issuePositions.length > 0 && (() => {
            const trEl = document.getElementById('translationField');
            if (!trEl) return null;
            
            const trRect = trEl.getBoundingClientRect();
            const cardWidth = 300;
            const cardMinGap = 12; // Increased from 8 to 16 for better spacing
            const cardLeft = trRect.right + 16;
            
            // Calculate non-overlapping positions
            const adjustedPositions: number[] = [];
            let lastBottom = 0;
            
            issuePositions.forEach((pos, idx) => {
              if (!pos || pos.top === 0) {
                adjustedPositions.push(0);
                return;
              }
              
              let desiredTop = trRect.top + pos.top - trEl.scrollTop;
              
              // Ensure minimum gap between cards
              if (adjustedPositions.length > 0 && desiredTop < lastBottom + cardMinGap) {
                desiredTop = lastBottom + cardMinGap;
              }
              
              adjustedPositions.push(desiredTop);
              
              // More accurate card height estimation
              const issue = parsedIssues[idx];
              const baseHeight = 80; // Base height for category, severity, message
              const messageLines = Math.ceil((issue.message?.length || 0) / 50); // Approximate lines
              const messageHeight = messageLines * 20;
              const suggestionHeight = issue.suggestion ? 70 + Math.ceil((issue.suggestion.length || 0) / 55) * 16 : 0;
              const textHeight = issue.text ? 30 : 0;
              const estimatedHeight = baseHeight + messageHeight + suggestionHeight + textHeight;
              
              lastBottom = desiredTop + estimatedHeight;
            });
            
            return (
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {parsedIssues.map((iss, idx) => {
                  const cardTop = adjustedPositions[idx];
                  if (cardTop === 0) return null;
                  
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
            shouldCloseOnInteractOutside={(e) => (Date.now() - elementDroppedTimestamp) > 200}
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
              <div style={{ position: 'absolute', left: contextualMenuPosition.x, top: contextualMenuPosition.y, width: 1, height: 1, background: 'red'}}>⋮
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
            <Textarea value={reviewText} minRows={20} onChange={() => {}} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

