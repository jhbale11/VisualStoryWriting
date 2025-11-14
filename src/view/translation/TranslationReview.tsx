import React, { useState, useEffect } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import type { TranslationProject, ParagraphMatchResult } from '../../translation/types';
import TranslationReviewInterface from '../textoshopReview/TranslationReviewInterface';
import { Button } from '@nextui-org/react';
import { FiX, FiDownload, FiGitMerge } from 'react-icons/fi';
import { ParagraphMatchingAgent } from '../../translation/agents/ParagraphMatchingAgent';
import { taskRunner } from '../../translation/services/TaskRunner';

interface TranslationReviewProps {
  project: TranslationProject;
  initialChunkIndex?: number;
  onClose?: () => void;
}

export const TranslationReview: React.FC<TranslationReviewProps> = ({ project, initialChunkIndex = 0, onClose }) => {
  const { updateChunk, createTask, tasks } = useTranslationStore();
  const [currentChunkIndex, setCurrentChunkIndex] = useState(initialChunkIndex);
  const [isMatching, setIsMatching] = useState(false);
  const [retranslateTaskId, setRetranslateTaskId] = useState<string | null>(null);

  const currentChunk = project.chunks[currentChunkIndex];
  const retranslateTask = retranslateTaskId ? tasks[retranslateTaskId] : undefined;
  const isRetranslating = retranslateTask?.status === 'running';
  
  // Monitor retranslate task completion
  useEffect(() => {
    if (retranslateTask && retranslateTask.status === 'completed') {
      // Task completed, clear the task ID
      setRetranslateTaskId(null);
      alert('Retranslation completed successfully!');
    } else if (retranslateTask && retranslateTask.status === 'failed') {
      setRetranslateTaskId(null);
      alert(`Retranslation failed: ${retranslateTask.error || 'Unknown error'}`);
    }
  }, [retranslateTask]);
  
  if (!currentChunk) {
    return <div>No chunk found</div>;
  }

  const handleSave = (updatedEnglish: string) => {
    updateChunk(project.id, currentChunk.id, {
      translations: {
        ...currentChunk.translations,
        final: updatedEnglish,
      },
    });
    alert('Changes saved successfully!');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
    } else if (direction === 'next' && currentChunkIndex < project.chunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    }
  };

  const handleDownloadAll = () => {
    // Collect all final translations
    const allTranslations = project.chunks
      .map((chunk) => {
        const translation = chunk.translations.final || '';
        return translation;
      })
      .filter(text => text.trim().length > 0)
      .join('\n\n');

    // Download as txt file
    const blob = new Blob([allTranslations], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_reviewed_translation.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunParagraphMatching = async () => {
    setIsMatching(true);

    try {
      const matchingAgent = new ParagraphMatchingAgent();
      const koreanText = currentChunk.text;
      const englishText = currentChunk.translations.final || '';

      if (!englishText) {
        throw new Error('No English translation found for this chunk');
      }

      const matchResult: ParagraphMatchResult = await matchingAgent.matchParagraphs(
        koreanText,
        englishText
      );

      // Reconstruct Korean text with the same paragraph breaks as English
      const reconstructedKoreanText = matchResult.koreanParagraphs.join('\n\n');

      // Save the match result and update the Korean text
      updateChunk(project.id, currentChunk.id, {
        text: reconstructedKoreanText, // Update Korean text with new paragraph breaks
        translations: {
          ...currentChunk.translations,
          paragraphMatches: matchResult,
        },
      });

      console.log('Paragraph matching completed:', matchResult);
    } catch (error) {
      console.error('Error running paragraph matching:', error);
      alert(`Error matching paragraphs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMatching(false);
    }
  };

  const handleRetranslate = () => {
    if (!project.glossary) {
      alert('Glossary is required for retranslation');
      return;
    }

    if (isRetranslating) {
      return; // Already retranslating
    }

    // Create a retranslate task
    const taskId = createTask({
      type: 'retranslate',
      projectId: project.id,
      chunkId: currentChunk.id,
    });

    setRetranslateTaskId(taskId);
    
    // Run the task
    taskRunner.runTask(taskId).catch(error => {
      console.error('Error running retranslate task:', error);
      alert(`Retranslation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRetranslateTaskId(null);
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Top bar with close and download buttons */}
      {onClose && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10000, display: 'flex', gap: 8 }}>
          <Button
            color="warning"
            variant="flat"
            startContent={<FiGitMerge />}
            onPress={handleRunParagraphMatching}
            isLoading={isMatching}
            isDisabled={isMatching}
          >
            Match Paragraphs
          </Button>
          <Button
            color="secondary"
            variant="flat"
            startContent={<FiDownload />}
            onPress={handleDownloadAll}
          >
            Download All
          </Button>
          <Button
            color="default"
            variant="flat"
            isIconOnly
            onPress={onClose}
          >
            <FiX size={20} />
          </Button>
        </div>
      )}
      
    <TranslationReviewInterface
      projectId={project.id}
      chunkId={currentChunk.id}
      koreanText={currentChunk.text}
      englishText={currentChunk.translations.final || ''}
      paragraphMatches={currentChunk.translations.paragraphMatches}
      onSave={handleSave}
      onNavigate={handleNavigate}
      onRetranslate={handleRetranslate}
      isRetranslating={isRetranslating}
      canNavigatePrev={currentChunkIndex > 0}
      canNavigateNext={currentChunkIndex < project.chunks.length - 1}
      chunkIndex={currentChunkIndex}
      totalChunks={project.chunks.length}
    />
    </div>
  );
};
