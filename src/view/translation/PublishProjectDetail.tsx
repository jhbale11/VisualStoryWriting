import React, { useState, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, Divider, Textarea, Spinner, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@nextui-org/react';
import { FiArrowLeft, FiPlay, FiDownload, FiSave, FiSettings, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { TranslationProject } from '../../translation/types';
import { DEFAULT_PUBLISH_PROMPT } from '../../translation/prompts/defaultPrompts';
import { taskRunner } from '../../translation/services/TaskRunner';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface PublishProjectDetailProps {
    project: TranslationProject;
}

export const PublishProjectDetail: React.FC<PublishProjectDetailProps> = ({ project }) => {
    const { selectProject, updateProject, createTask, tasks } = useTranslationStore();
    const [activeTab, setActiveTab] = useState<'editor' | 'diff'>('editor');
    const [prompt, setPrompt] = useState(project.prompts?.publish || DEFAULT_PUBLISH_PROMPT);
    const [isRunning, setIsRunning] = useState(false);

    // Diff View State
    const [showDiffOnly, setShowDiffOnly] = useState(false);

    // Download State
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [downloadFilename, setDownloadFilename] = useState(`${project.name}_published.txt`);

    // Find active task for this project
    useEffect(() => {
        const activeTask = Object.values(tasks).find(
            t => t.projectId === project.id && t.type === 'publish' && t.status === 'running'
        );
        if (activeTask) {
            setIsRunning(true);
        } else {
            setIsRunning(false);
        }
    }, [tasks, project.id]);

    const handleBack = () => {
        selectProject('');
    };

    const handleSavePrompt = () => {
        updateProject(project.id, {
            prompts: {
                ...project.prompts,
                publish: prompt
            }
        });
        alert('Prompt saved!');
    };

    const handleRun = async () => {
        if (isRunning) return;

        try {
            const taskId = createTask({
                type: 'publish',
                projectId: project.id,
                metadata: {
                    prompt: prompt,
                    sourceText: project.file_content
                }
            });

            setIsRunning(true);
            setActiveTab('diff'); // Switch to diff view to see results coming in (if we had streaming)

            await taskRunner.runTask(taskId);

            // Task completion is handled by the store/runner updating the project
        } catch (error) {
            console.error('Failed to run publish agent:', error);
            alert('Failed to start publish agent');
            setIsRunning(false);
        }
    };

    const handleDownloadClick = () => {
        const result = project.chunks[0]?.translations?.final || '';
        if (!result) {
            alert('No result to download yet.');
            return;
        }
        setDownloadFilename(`${project.name}_published.txt`);
        setIsDownloadModalOpen(true);
    };

    const handleDownloadConfirm = () => {
        const result = project.chunks[0]?.translations?.final || '';
        const blob = new Blob([result], { type: 'text/plain' });
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

    // Get result for diff view
    const resultText = project.chunks[0]?.translations?.final || '';

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button isIconOnly variant="light" onPress={handleBack}>
                        <FiArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{project.name}</h1>
                        <p className="text-xs text-gray-500">Publish Agent Workspace</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        color="primary"
                        startContent={isRunning ? <Spinner size="sm" color="white" /> : <FiPlay />}
                        onPress={handleRun}
                        isDisabled={isRunning}
                    >
                        {isRunning ? 'Running...' : 'Run Agent'}
                    </Button>
                    <Button
                        color="secondary"
                        variant="flat"
                        startContent={<FiDownload />}
                        onPress={handleDownloadClick}
                        isDisabled={!resultText}
                    >
                        Download
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4">
                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key as 'editor' | 'diff')}
                    classNames={{
                        tabList: "flex-1 overflow-hidden p-0"
                    }}
                >
                    <Tab key="editor" title="Prompt & Settings">
                        <div className="h-full flex gap-4">
                            <Card className="flex-1 h-full">
                                <CardHeader className="flex justify-between">
                                    <span className="font-semibold flex items-center gap-2">
                                        <FiSettings /> Agent Prompt
                                    </span>
                                    <Button size="sm" variant="flat" onPress={handleSavePrompt} startContent={<FiSave />}>
                                        Save Prompt
                                    </Button>
                                </CardHeader>
                                <Divider />
                                <CardBody className="p-0">
                                    <Textarea
                                        classNames={{
                                            input: "font-mono text-sm h-full min-h-[500px]",
                                            inputWrapper: "h-full"
                                        }}
                                        value={prompt}
                                        onValueChange={setPrompt}
                                        placeholder="Enter agent prompt here..."
                                        fullWidth
                                        disableAnimation
                                    />
                                </CardBody>
                            </Card>

                            <Card className="w-1/3 h-full">
                                <CardHeader>
                                    <span className="font-semibold">Source Preview</span>
                                </CardHeader>
                                <Divider />
                                <CardBody>
                                    <div className="text-sm font-mono whitespace-pre-wrap overflow-y-auto h-[500px] text-gray-600 dark:text-gray-400">
                                        {project.file_content.slice(0, 2000)}
                                        {project.file_content.length > 2000 && '... (truncated)'}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </Tab>

                    <Tab key="diff" title="Result (Diff View)">
                        <Card className="h-full overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center bg-gray-50 dark:bg-gray-800">
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={showDiffOnly ? "solid" : "flat"}
                                        color={showDiffOnly ? "warning" : "default"}
                                        onPress={() => setShowDiffOnly(!showDiffOnly)}
                                        startContent={showDiffOnly ? <FiEye /> : <FiEyeOff />}
                                    >
                                        {showDiffOnly ? 'Diffs Only' : 'Show All'}
                                    </Button>
                                </div>
                            </div>
                            <CardBody className="p-0 flex-1 overflow-hidden relative">
                                {resultText ? (
                                    <div className="h-full overflow-y-auto">
                                        <ReactDiffViewer
                                            oldValue={project.file_content}
                                            newValue={resultText}
                                            splitView={false}
                                            showDiffOnly={showDiffOnly}
                                            useDarkTheme={true}
                                            styles={{
                                                diffContainer: {
                                                    width: '100%',
                                                },
                                                line: {
                                                    wordBreak: 'break-word',
                                                    fontSize: '12px',
                                                    lineHeight: '1.5',
                                                },
                                                content: {
                                                    fontSize: '12px',
                                                    lineHeight: '1.5',
                                                }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <p className="text-lg">No result yet</p>
                                        <p className="text-sm">Run the agent to generate the formatted text</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Tab>
                </Tabs>
            </div>

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
                    <ModalHeader>Download File</ModalHeader>
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
                        <Button color="primary" onPress={handleDownloadConfirm}>
                            Download
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};
