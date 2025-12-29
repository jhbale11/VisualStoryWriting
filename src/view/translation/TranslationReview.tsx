import React, { useState, useEffect } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import type { TranslationProject, ParagraphMatchResult } from '../../translation/types';
import TranslationReviewInterface from '../textoshopReview/TranslationReviewInterface';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea } from '@nextui-org/react';
import { FiX, FiDownload, FiGitMerge } from 'react-icons/fi';
import { taskRunner } from '../../translation/services/TaskRunner';

interface TranslationReviewProps {
  project: TranslationProject;
  initialChunkIndex?: number;
  onClose?: () => void;
}

export const TranslationReview: React.FC<TranslationReviewProps> = ({ project, initialChunkIndex = 0, onClose }) => {
  const { updateChunk, createTask, tasks } = useTranslationStore();
  // IMPORTANT: Use live project from store so chunk edits/saves are reflected immediately
  // (prop `project` can be a snapshot and become stale).
  const liveProject = useTranslationStore((state) =>
    state.projects.find(p => p.id === project.id) ||
    state.archivedProjects.find(p => p.id === project.id)
  );
  const effectiveProject = liveProject || project;
  const [currentChunkIndex, setCurrentChunkIndex] = useState(initialChunkIndex);
  const [retranslateTaskId, setRetranslateTaskId] = useState<string | null>(null);
  const [matchTaskId, setMatchTaskId] = useState<string | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyPromptInput, setEmergencyPromptInput] = useState<string>('');

  // Download State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState(`${project.name}_reviewed_translation.txt`);

  const currentChunk = effectiveProject.chunks[currentChunkIndex];
  const retranslateTask = retranslateTaskId ? tasks[retranslateTaskId] : undefined;
  const isRetranslating = retranslateTask?.status === 'running';
  const matchTask = matchTaskId ? tasks[matchTaskId] : undefined;
  const isMatching = matchTask?.status === 'running';

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

  // Monitor match task completion
  useEffect(() => {
    if (matchTask && matchTask.status === 'completed') {
      setMatchTaskId(null);
      alert('Paragraph matching completed successfully!');
    } else if (matchTask && matchTask.status === 'failed') {
      setMatchTaskId(null);
      alert(`Paragraph matching failed: ${matchTask.error || 'Unknown error'}`);
    }
  }, [matchTask]);

  if (!currentChunk) {
    return <div>No chunk found</div>;
  }

  const handleSave = (updatedEnglish: string, updatedMatches?: ParagraphMatchResult) => {
    updateChunk(effectiveProject.id, currentChunk.id, {
      translations: {
        ...currentChunk.translations,
        final: updatedEnglish,
        paragraphMatches: updatedMatches || currentChunk.translations.paragraphMatches,
      },
    });
    alert('Changes saved successfully!');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentChunkIndex > 0) {
      setCurrentChunkIndex(currentChunkIndex - 1);
    } else if (direction === 'next' && currentChunkIndex < effectiveProject.chunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    }
  };

  const handleDownloadAllClick = () => {
    // Check if there's content to download
    const hasContent = effectiveProject.chunks.some(chunk => chunk.translations.final && chunk.translations.final.trim().length > 0);
    if (!hasContent) {
      alert('No translations to download yet.');
      return;
    }
    setDownloadFilename(`${effectiveProject.name}_reviewed_translation.txt`);
    setIsDownloadModalOpen(true);
  };

  const handleDownloadAllConfirm = () => {
    // Collect all final translations
    const allTranslations = effectiveProject.chunks
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
    if (isMatching) return;

    const englishText = currentChunk.translations.final || '';
    if (!englishText || !englishText.trim()) {
      alert('No English translation found for this chunk');
      return;
    }

    const taskId = createTask({
      type: 'match_paragraphs',
      projectId: effectiveProject.id,
      chunkId: currentChunk.id,
    });
    setMatchTaskId(taskId);

    taskRunner.runTask(taskId).catch(error => {
      console.error('Error running match paragraphs task:', error);
      alert(`Paragraph matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMatchTaskId(null);
    });
  };

  const handleRetranslate = (userEmergencyPrompt?: string) => {
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
      projectId: effectiveProject.id,
      chunkId: currentChunk.id,
      metadata: userEmergencyPrompt ? { emergencyPrompt: userEmergencyPrompt } : undefined,
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
        key={currentChunk.id}
        projectId={effectiveProject.id}
        chunkId={currentChunk.id}
        koreanText={currentChunk.text}
        englishText={currentChunk.translations.final || ''}
        paragraphMatches={currentChunk.translations.paragraphMatches}
        initialReviewIssues={currentChunk.translations.reviewIssues as any}
        onSave={handleSave}
        onNavigate={handleNavigate}
        onRetranslate={() => setIsEmergencyModalOpen(true)}
        isRetranslating={isRetranslating}
        canNavigatePrev={currentChunkIndex > 0}
        canNavigateNext={currentChunkIndex < effectiveProject.chunks.length - 1}
        chunkIndex={currentChunkIndex}
        totalChunks={effectiveProject.chunks.length}
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

      {/* Emergency Prompt Modal */}
      <Modal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        size="lg"
        classNames={{
          wrapper: 'z-[1000000]',
          backdrop: 'z-[999999]',
          base: 'z-[1000001]',
        }}
      >
        <ModalContent>
          <ModalHeader>Emergency Prompt for Retranslation</ModalHeader>
          <ModalBody>
            <p style={{ fontSize: 12, color: '#555' }}>
              입력한 프롬프트는 translation / enhancement / proofread 에이전트 모두에 우선 적용됩니다.
            </p>
            <Textarea
              label="Emergency Prompt"
              minRows={4}
              placeholder="번역시 절대 지켜야 할 지침을 적어주세요 (예: 고유명/호칭 유지, 특정 톤 유지 등)"
              value={emergencyPromptInput}
              onChange={(e) => setEmergencyPromptInput(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsEmergencyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="secondary"
              onPress={() => {
                setIsEmergencyModalOpen(false);
                handleRetranslate(emergencyPromptInput.trim() || undefined);
              }}
            >
              Retranslate with Prompt
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
