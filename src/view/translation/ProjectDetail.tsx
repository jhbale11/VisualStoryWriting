import React, { useState, useEffect, useRef } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { taskRunner } from '../../translation/services/TaskRunner';
import { TaskSidebar } from './TaskSidebar';
import type { TranslationProject, Task, Glossary } from '../../translation/types';
import {
  Button,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Chip,
  Accordion,
  AccordionItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
} from '@nextui-org/react';
import { FiArrowLeft, FiPlay, FiPause, FiDownload, FiUpload, FiEdit2, FiEdit } from 'react-icons/fi';
import { TranslationReview } from './TranslationReview';
import { PublishProjectDetail } from './PublishProjectDetail';

interface ProjectDetailProps {
  project: TranslationProject;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project: initialProject }) => {
  const { selectProject, createTask, updateTask, tasks, updateProject, setGlossary, projects, archivedProjects } = useTranslationStore();
  const [activeTaskId, setActiveTaskId] = useState<string>();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [glossaryJson, setGlossaryJson] = useState('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isOpen: isEditGlossaryOpen, onOpen: onEditGlossaryOpen, onClose: onEditGlossaryClose } = useDisclosure();
  const { isOpen: isUploadGlossaryOpen, onOpen: onUploadGlossaryOpen, onClose: onUploadGlossaryClose } = useDisclosure();

  // Always get the latest project from store to reflect updates
  // Check both active and archived projects
  const project = projects.find(p => p.id === initialProject.id) ||
    archivedProjects.find(p => p.id === initialProject.id) ||
    initialProject;

  // Debug: Log project state on every render
  useEffect(() => {
    console.log('[ProjectDetail] Project state:', {
      id: project.id,
      name: project.name,
      status: project.status,
      hasGlossary: !!project.glossary,
      glossarySize: project.glossary ? JSON.stringify(project.glossary).length : 0,
    });
  }, [project]);

  // Render PublishProjectDetail if project type is 'publish'
  if (project.type === 'publish') {
    return <PublishProjectDetail project={project} />;
  }

  const activeTask = activeTaskId ? tasks[activeTaskId] : undefined;

  useEffect(() => {
    if (project.glossary && isEditGlossaryOpen) {
      setGlossaryJson(JSON.stringify(project.glossary, null, 2));
    }
  }, [project.glossary, isEditGlossaryOpen]);

  useEffect(() => {
    // Poll for task updates
    if (activeTask && activeTask.status === 'running') {
      const interval = setInterval(() => {
        // Task updates happen automatically through store
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTask]);

  const handleGenerateGlossary = () => {
    const taskId = createTask({
      type: 'glossary',
      projectId: project.id,
    });
    setActiveTaskId(taskId);
    taskRunner.runTask(taskId);
  };

  const handleStartTranslation = () => {
    console.log('[ProjectDetail] Starting translation check:', {
      projectId: project.id,
      projectStatus: project.status,
      hasGlossary: !!project.glossary,
      glossaryKeys: project.glossary ? Object.keys(project.glossary) : 'none',
    });

    if (!project.glossary) {
      console.error('[ProjectDetail] Glossary check failed:', {
        status: project.status,
        glossary: project.glossary,
      });
      alert(`Glossary not available. 
      
Status: ${project.status}
Has Glossary: ${!!project.glossary}

Please upload or generate glossary first.`);
      return;
    }

    const taskId = createTask({
      type: 'translation',
      projectId: project.id,
    });
    setActiveTaskId(taskId);
    taskRunner.runTask(taskId);
  };

  const handleCancelTask = () => {
    if (activeTaskId) {
      taskRunner.cancelTask(activeTaskId);
      setActiveTaskId(undefined);
    }
  };

  const handleDownloadFinal = () => {
    const finalTexts = project.chunks
      .map(c => c.translations.final)
      .filter(Boolean)
      .join('\n\n');

    const blob = new Blob([finalTexts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_translation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGlossary = () => {
    if (!project.glossary) return;

    const blob = new Blob([JSON.stringify(project.glossary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_glossary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setGlossaryJson(content);
    };
    reader.readAsText(file);
  };

  const handleUploadGlossary = () => {
    if (!glossaryJson || !glossaryJson.trim()) {
      alert('Please select a file or paste JSON content first.');
      return;
    }

    try {
      const parsedGlossary = JSON.parse(glossaryJson) as Glossary;

      // Validate that it's a valid glossary object
      if (typeof parsedGlossary !== 'object' || parsedGlossary === null) {
        throw new Error('Invalid glossary format');
      }

      // Use setGlossary which properly updates status and saves to storage
      setGlossary(project.id, parsedGlossary);

      // Close modal and clear input
      onUploadGlossaryClose();
      setGlossaryJson('');

      // Show success message
      setTimeout(() => {
        alert('Glossary uploaded successfully! You can now start translation.');
      }, 100);
    } catch (error) {
      alert('Invalid JSON format. Please check your glossary file.');
      console.error('Failed to parse glossary:', error);
    }
  };

  const handleSaveGlossary = () => {
    if (!glossaryJson || !glossaryJson.trim()) {
      alert('Glossary content cannot be empty.');
      return;
    }

    try {
      const parsedGlossary = JSON.parse(glossaryJson) as Glossary;

      // Validate that it's a valid glossary object
      if (typeof parsedGlossary !== 'object' || parsedGlossary === null) {
        throw new Error('Invalid glossary format');
      }

      // Use setGlossary to ensure proper storage sync
      setGlossary(project.id, parsedGlossary);

      // Close modal
      onEditGlossaryClose();

      // Show success message
      setTimeout(() => {
        alert('Glossary saved successfully!');
      }, 100);
    } catch (error) {
      alert('Invalid JSON format. Please check your glossary.');
      console.error('Failed to parse glossary:', error);
    }
  };

  const renderGlossaryPreview = () => {
    if (!project.glossary) return null;

    const glossary = project.glossary as any;

    // Helper to get items as array
    const getItemsAsArray = (items: any) => {
      if (!items) return [];
      if (Array.isArray(items)) return items;
      return Object.entries(items).map(([key, value]) => ({ key, ...value }));
    };

    const characters = getItemsAsArray(glossary.characters);
    const terms = getItemsAsArray(glossary.terms);
    const places = getItemsAsArray(glossary.places || glossary.locations);

    return (
      <div className="space-y-4">
        {/* Characters */}
        {characters.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Characters ({characters.length})</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {characters.slice(0, 10).map((char: any, idx: number) => (
                  <div key={idx} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {char.korean_name || char.name || char.key}
                      </span>
                      <span className="text-gray-600">
                        {char.english_name || char.english || char.name}
                      </span>
                    </div>
                    {char.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {char.description}
                      </p>
                    )}
                  </div>
                ))}
                {characters.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    ... and {characters.length - 10} more
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Terms */}
        {terms.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Terms ({terms.length})</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {terms.slice(0, 10).map((term: any, idx: number) => (
                  <div key={idx} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {term.original || term.korean_name || term.key}
                      </span>
                      <span className="text-gray-600">
                        {term.translation || term.english}
                      </span>
                    </div>
                    {term.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {term.description}
                      </p>
                    )}
                  </div>
                ))}
                {terms.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    ... and {terms.length - 10} more
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Places */}
        {places.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Places ({places.length})</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {places.slice(0, 10).map((place: any, idx: number) => (
                  <div key={idx} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {place.korean_name || place.name || place.key}
                      </span>
                      <span className="text-gray-600">
                        {place.english_name || place.english || place.name}
                      </span>
                    </div>
                    {place.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {place.description}
                      </p>
                    )}
                  </div>
                ))}
                {places.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    ... and {places.length - 10} more
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Additional Info */}
        {glossary.events && glossary.events.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Events ({glossary.events.length})</h3>
            </CardHeader>
          </Card>
        )}

        {glossary.style_guide && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Style Guide</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                {glossary.style_guide.genre && (
                  <div>
                    <span className="font-medium">Genre: </span>
                    {glossary.style_guide.genre}
                  </div>
                )}
                {glossary.style_guide.tone && (
                  <div>
                    <span className="font-medium">Tone: </span>
                    {glossary.style_guide.tone}
                  </div>
                )}
                {glossary.style_guide.content_rating && (
                  <div>
                    <span className="font-medium">Content Rating: </span>
                    {glossary.style_guide.content_rating}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  const completedChunks = project.chunks.filter(c => c.status === 'completed').length;
  const totalChunks = project.chunks.length;

  // Full screen review mode
  if (isReviewMode) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#F2EEF0' }}>
        <TranslationReview
          project={project}
          onClose={() => setIsReviewMode(false)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="light"
              startContent={<FiArrowLeft />}
              onPress={() => selectProject(undefined as any)}
            >
              Back to Projects
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <div className="flex gap-2 items-center">
              <Chip size="sm" variant="flat">
                {project.type === 'glossary' ? 'Glossary' : 'Translation'}
              </Chip>
              <Chip size="sm" variant="flat">
                {project.language === 'ja' ? 'Japanese' : 'English'}
              </Chip>
              <Chip
                size="sm"
                color={project.status === 'translation_completed' ? 'success' : 'primary'}
              >
                {project.status}
              </Chip>
            </div>
          </div>

          <Tabs selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(k as string)}>
            <Tab key="overview" title="Overview">
              <div className="pt-4 space-y-6">
                {/* Progress Card */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Translation Progress</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Overall Progress</span>
                          <span>{Math.round(project.translation_progress * 100)}%</span>
                        </div>
                        <Progress
                          value={project.translation_progress * 100}
                          color={project.translation_progress === 1 ? 'success' : 'primary'}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{totalChunks}</p>
                          <p className="text-sm text-gray-600">Total Chunks</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{completedChunks}</p>
                          <p className="text-sm text-gray-600">Completed</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {totalChunks - completedChunks}
                          </p>
                          <p className="text-sm text-gray-600">Remaining</p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Active Task Card */}
                {activeTask && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Current Task</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{activeTask.type}</span>
                          <Chip
                            size="sm"
                            color={
                              activeTask.status === 'completed'
                                ? 'success'
                                : activeTask.status === 'failed'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {activeTask.status}
                          </Chip>
                        </div>

                        {activeTask.status === 'running' && (
                          <div>
                            <div className="flex justify-between mb-2">
                              <span>{activeTask.message}</span>
                              <span>{Math.round(activeTask.progress * 100)}%</span>
                            </div>
                            <Progress value={activeTask.progress * 100} />
                          </div>
                        )}

                        {activeTask.error && (
                          <div className="text-red-600 text-sm">{activeTask.error}</div>
                        )}

                        {activeTask.status === 'running' && (
                          <Button
                            color="danger"
                            variant="flat"
                            startContent={<FiPause />}
                            onPress={handleCancelTask}
                          >
                            Cancel Task
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Actions Card */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Actions</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="flex gap-3">
                      {!project.glossary && (
                        <Button
                          color="primary"
                          startContent={<FiPlay />}
                          onPress={handleGenerateGlossary}
                          isDisabled={activeTask?.status === 'running'}
                        >
                          Generate Glossary
                        </Button>
                      )}

                      {project.glossary && project.status !== 'translation_completed' && (
                        <Button
                          color="success"
                          startContent={<FiPlay />}
                          onPress={handleStartTranslation}
                          isDisabled={activeTask?.status === 'running'}
                        >
                          Start Translation
                        </Button>
                      )}

                      {project.translation_progress > 0 && (
                        <Button
                          color="secondary"
                          startContent={<FiDownload />}
                          onPress={handleDownloadFinal}
                        >
                          Download Translation
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="glossary" title="Glossary">
              <div className="pt-4">
                {project.glossary ? (
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        color="primary"
                        startContent={<FiDownload />}
                        onPress={handleDownloadGlossary}
                      >
                        Download Glossary
                      </Button>
                      <Button
                        color="secondary"
                        startContent={<FiEdit2 />}
                        onPress={() => {
                          setGlossaryJson(JSON.stringify(project.glossary, null, 2));
                          onEditGlossaryOpen();
                        }}
                      >
                        Edit Glossary
                      </Button>
                      <Button
                        variant="bordered"
                        startContent={<FiUpload />}
                        onPress={() => {
                          setGlossaryJson('');
                          onUploadGlossaryOpen();
                        }}
                      >
                        Replace Glossary
                      </Button>
                    </div>

                    {/* Glossary Preview */}
                    {renderGlossaryPreview()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No glossary available</p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        color="primary"
                        startContent={<FiPlay />}
                        onPress={handleGenerateGlossary}
                        isDisabled={activeTask?.status === 'running'}
                      >
                        Generate Glossary
                      </Button>
                      <Button
                        variant="bordered"
                        startContent={<FiUpload />}
                        onPress={() => {
                          setGlossaryJson('');
                          onUploadGlossaryOpen();
                        }}
                      >
                        Upload Glossary
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="chunks" title="Chunks">
              <div className="pt-4">
                <Accordion>
                  {project.chunks.map((chunk, idx) => (
                    <AccordionItem
                      key={chunk.id}
                      title={
                        <div className="flex justify-between items-center w-full">
                          <span>Chunk {idx + 1}</span>
                          <Chip
                            size="sm"
                            color={
                              chunk.status === 'completed'
                                ? 'success'
                                : chunk.status === 'processing'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {chunk.status}
                          </Chip>
                        </div>
                      }
                    >
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Original (Korean)</h4>
                          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                            {chunk.text}
                          </div>
                        </div>

                        {chunk.translations.final && (
                          <div>
                            <h4 className="font-semibold mb-2">
                              Translation ({project.language === 'ja' ? 'Japanese' : 'English'})
                            </h4>
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                              {chunk.translations.final}
                            </div>
                          </div>
                        )}

                        {chunk.translations.qualityScore && (
                          <div>
                            <span className="font-semibold">Quality Score: </span>
                            <Chip
                              size="sm"
                              color={
                                chunk.translations.qualityScore >= 80
                                  ? 'success'
                                  : chunk.translations.qualityScore >= 60
                                    ? 'warning'
                                    : 'danger'
                              }
                            >
                              {chunk.translations.qualityScore}
                            </Chip>
                          </div>
                        )}
                      </div>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Tab>

            <Tab key="review" title="Review & Edit" isDisabled={project.translation_progress === 0}>
              <div className="pt-4">
                {project.translation_progress > 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg font-semibold mb-4">Review & Edit Translation</p>
                    <p className="text-gray-600 mb-6">
                      Use AI-powered tools to review and refine your translations with advanced editing features.
                    </p>
                    <Button
                      color="primary"
                      size="lg"
                      startContent={<FiEdit />}
                      onPress={() => setIsReviewMode(true)}
                    >
                      Open Full Screen Editor
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">Translation must be completed before review</p>
                    <Button
                      color="primary"
                      startContent={<FiPlay />}
                      onPress={handleStartTranslation}
                      isDisabled={!project.glossary || activeTask?.status === 'running'}
                    >
                      Start Translation
                    </Button>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>

      {/* Upload/Replace Glossary Modal */}
      <Modal
        isOpen={isUploadGlossaryOpen}
        onClose={onUploadGlossaryClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            {project.glossary ? 'Replace Glossary' : 'Upload Glossary'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Upload a JSON file or paste your glossary JSON below:
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="bordered"
                  startContent={<FiUpload />}
                  onPress={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
              </div>

              <Textarea
                label="Glossary JSON"
                placeholder='{"characters": [...], "terms": [...], ...}'
                value={glossaryJson}
                onValueChange={setGlossaryJson}
                minRows={20}
                maxRows={30}
                classNames={{
                  input: "font-mono text-sm"
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onUploadGlossaryClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleUploadGlossary}
              isDisabled={!glossaryJson.trim()}
            >
              {project.glossary ? 'Replace' : 'Upload'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Glossary Modal */}
      <Modal
        isOpen={isEditGlossaryOpen}
        onClose={onEditGlossaryClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Edit Glossary</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Edit your glossary JSON. Changes will be saved to the project.
              </p>

              <Textarea
                label="Glossary JSON"
                value={glossaryJson}
                onValueChange={setGlossaryJson}
                minRows={25}
                maxRows={35}
                classNames={{
                  input: "font-mono text-sm"
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditGlossaryClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSaveGlossary}
              isDisabled={!glossaryJson.trim()}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

