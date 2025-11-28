import React, { useState, useEffect } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import type { TranslationProject, ParagraphMatchResult } from '../../translation/types';
import TranslationReviewInterface from '../textoshopReview/TranslationReviewInterface';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@nextui-org/react';
import { FiX, FiDownload, FiGitMerge } from 'react-icons/fi';
import { ParagraphMatchingAgent } from '../../translation/agents/ParagraphMatchingAgent';
import { LayoutAgent } from '../../translation/agents/LayoutAgent';
import { LLMClientFactory } from '../../translation/llm/clients';
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

  // Download State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState(`${project.name}_reviewed_translation.txt`);

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

  const handleDownloadAllClick = () => {
    // Check if there's content to download
    const hasContent = project.chunks.some(chunk => chunk.translations.final && chunk.translations.final.trim().length > 0);
    if (!hasContent) {
      alert('No translations to download yet.');
      return;
    }
    setDownloadFilename(`${project.name}_reviewed_translation.txt`);
    setIsDownloadModalOpen(true);
  };

  const handleDownloadAllConfirm = () => {
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
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsDownloadModalOpen(false);
  };

  const handleRunParagraphMatching = async () => {
    setIsMatching(true);

    try {
      const englishText = currentChunk.translations.final || '';

      if (!englishText) {
        throw new Error('No English translation found for this chunk');
      }

      // 1. Run Layout Agent first to ensure correct formatting (double newlines)
      console.log('Running Layout Agent...');
      let formattedEnglish = englishText;

      try {
        // Use project's layout config or default to Gemini
        const layoutConfig = project.agent_configs.layout || {
          provider: 'gemini',
          model: 'gemini-2.5-pro',
          temperature: 0.3
        };

        const client = LLMClientFactory.createClient(layoutConfig);
        const layoutAgent = new LayoutAgent(client, project.language);

        formattedEnglish = await layoutAgent.format(englishText);
        console.log('Layout formatting completed');
      } catch (layoutError) {
        console.error('Layout Agent failed, proceeding with original text:', layoutError);
        // We continue with original text if layout fails, but warn the user
        console.warn('Proceeding with paragraph matching using unformatted text due to layout failure');
      }

      // 2. Run Paragraph Matching with the formatted text
      console.log('Running Paragraph Matching...');
      const matchingAgent = new ParagraphMatchingAgent();
      const koreanText = currentChunk.text;

      const matchResult: ParagraphMatchResult = await matchingAgent.matchParagraphs(
        koreanText,
        formattedEnglish
      );

      // Reconstruct Korean text with the same paragraph breaks as English
      const reconstructedKoreanText = matchResult.koreanParagraphs.join('\n\n');

      // Save the match result AND the formatted English text
      updateChunk(project.id, currentChunk.id, {
        text: reconstructedKoreanText, // Update Korean text with new paragraph breaks
        translations: {
          ...currentChunk.translations,
          final: formattedEnglish, // Update English text with layout formatting
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
            onPress={handleDownloadAllClick}
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

      {/* Download Filename Modal */}
      <Modal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        classNames={{
          wrapper: "z-[99999]",
          backdrop: "z-[99998]"
        }}
      >
        <ModalContent>
          <ModalHeader>Download All Translations</ModalHeader>
          <ModalBody>
            <Input
              label="Filename"
              value={downloadFilename}
              onValueChange={setDownloadFilename}
              placeholder="Enter filename"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsDownloadModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleDownloadAllConfirm}>
              Download
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
