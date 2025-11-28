import React, { useState, useEffect, useRef } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { ProjectList } from './ProjectList';
import { GlossaryProjectList } from './GlossaryProjectList';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectDetail } from './ProjectDetail';
import { Button, Tabs, Tab, Card, CardBody, Spinner } from '@nextui-org/react';
import { FiUpload } from 'react-icons/fi';

export const TranslationMain: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'glossary' | 'translation' | 'publish'>('translation');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [glossaryListKey, setGlossaryListKey] = useState(0);
  const [glossaryProjectCount, setGlossaryProjectCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get store data with error handling
  let projects: any[] = [];
  let archivedProjects: any[] = [];
  let selectedProjectId: string | undefined;
  let importProject: ((jsonContent: string) => Promise<void>) | undefined;

  try {
    const store = useTranslationStore();
    projects = store.projects || [];
    archivedProjects = store.archivedProjects || [];
    selectedProjectId = store.selectedProjectId;
    importProject = store.importProject;
  } catch (err) {
    console.error('Store error:', err);
    setError(err instanceof Error ? err.message : 'Failed to load projects');
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      // Import via store (which will handle IndexedDB storage)
      if (importProject) {
        await importProject(text);
        alert(`Successfully imported project: ${file.name}`);

        // Force re-render
        setGlossaryListKey(prev => prev + 1);
      }
    } catch (error) {
      alert(`Failed to import project: ${error}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    // Simulate loading to ensure store is initialized
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Translation System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardBody>
            <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Translation System</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
            <Button color="primary" onPress={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Find selected project in both active and archived projects
  const selectedProject = projects.find(p => p.id === selectedProjectId) ||
    archivedProjects.find(p => p.id === selectedProjectId);

  // Split projects by type
  // Translation projects from translation store (have type === 'translation')
  const translationProjects = projects.filter(p => p.type === 'translation');
  const publishProjects = projects.filter(p => p.type === 'publish');

  const hasGlossaryProjects = glossaryProjectCount > 0;

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Translation System
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage glossary building and translation projects with AI
              </p>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <Button
                color="secondary"
                size="lg"
                variant="flat"
                startContent={<FiUpload />}
                onPress={() => fileInputRef.current?.click()}
              >
                Import
              </Button>
              <Button
                color="primary"
                size="lg"
                onPress={() => setIsCreateModalOpen(true)}
              >
                + New Project
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardBody>
                <p className="text-sm text-gray-600 dark:text-gray-400">Translation Projects</p>
                <p className="text-3xl font-bold text-green-600">{translationProjects.length}</p>
              </CardBody>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-900/20">
              <CardBody>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Tasks</p>
                <p className="text-3xl font-bold text-orange-600">
                  {projects.filter(p =>
                    p.status === 'glossary_running' ||
                    p.status === 'translating'
                  ).length}
                </p>
              </CardBody>
            </Card>

            <Card
              className="bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover:shadow-lg transition-shadow"
              isPressable
              onPress={() => setSelectedTab('glossary')}
            >
              <CardBody>
                <p className="text-sm text-gray-600 dark:text-gray-400">Glossary Projects</p>
                <p className="text-3xl font-bold text-purple-600">{glossaryProjectCount}</p>
              </CardBody>
            </Card>

            <Card
              className="bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:shadow-lg transition-shadow"
              isPressable
              onPress={() => setSelectedTab('publish')}
            >
              <CardBody>
                <p className="text-sm text-gray-600 dark:text-gray-400">Publish Projects</p>
                <p className="text-3xl font-bold text-blue-600">{publishProjects.length}</p>
              </CardBody>
            </Card>
          </div>

          {/* Tabbed Project Lists */}
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => {
              setSelectedTab(key as 'glossary' | 'translation' | 'publish');
              if (key === 'glossary') {
                setGlossaryListKey(prev => prev + 1);
              }
            }}
            size="lg"
            className="mb-6"
          >
            <Tab
              key="translation"
              title={
                <div className="flex items-center gap-2">
                  <span>📝 Translation Projects</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    {translationProjects.length}
                  </span>
                </div>
              }
            >
              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Translation Projects</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Full translation pipeline with glossary-based processing
                    </p>
                  </div>
                  <Button
                    color="success"
                    variant="flat"
                    onPress={() => {
                      setIsCreateModalOpen(true);
                    }}
                  >
                    + New Translation
                  </Button>
                </div>

                <ProjectList filterType="translation" />
              </div>
            </Tab>

            <Tab
              key="glossary"
              title={
                <div className="flex items-center gap-2">
                  <span>📚 Glossary Builder</span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                    {glossaryProjectCount}
                  </span>
                </div>
              }
            >
              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Glossary Builder Projects</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Interactive analysis with visual graphs, timeline, and JSON export
                    </p>
                  </div>
                  <Button
                    color="secondary"
                    variant="flat"
                    onPress={() => setIsCreateModalOpen(true)}
                  >
                    + New Glossary
                  </Button>
                </div>

                {!hasGlossaryProjects && (
                  <Card className="bg-white dark:bg-gray-800 mb-6">
                    <CardBody className="text-center py-12">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                        No glossary projects yet
                      </p>
                      <p className="text-sm text-gray-400 mb-6 max-w-2xl mx-auto">
                        Create an interactive glossary project to analyze your story with visual graphs,
                        character relationships, timeline view, and export to JSON for translation projects.
                      </p>
                      <div className="max-w-2xl mx-auto mb-6 text-left">
                        <h3 className="font-semibold mb-3">Features:</h3>
                        <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                          <li>✅ Visual Graph View - Interactive character relationships and event flow</li>
                          <li>✅ Real-time Editing - Click any element to edit details</li>
                          <li>✅ AI-Powered Extraction - Automatic analysis with Google Gemini</li>
                          <li>✅ Timeline View - Chronological event visualization</li>
                          <li>✅ JSON Export - Download for translation projects</li>
                        </ul>
                      </div>
                      <Button
                        color="secondary"
                        onPress={() => setIsCreateModalOpen(true)}
                      >
                        Create First Glossary Project
                      </Button>
                    </CardBody>
                  </Card>
                )}

                <GlossaryProjectList
                  key={glossaryListKey}
                  onProjectsChanged={(projects) => setGlossaryProjectCount(projects.length)}
                />
              </div>
            </Tab>

            <Tab
              key="publish"
              title={
                <div className="flex items-center gap-2">
                  <span>🚀 Publish Projects</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {publishProjects.length}
                  </span>
                </div>
              }
            >
              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Publish Projects</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Format novels for Webnovel platform
                    </p>
                  </div>
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={() => setIsCreateModalOpen(true)}
                  >
                    + New Publish Project
                  </Button>
                </div>

                <ProjectList filterType="publish" />
              </div>
            </Tab>
          </Tabs>

          {isCreateModalOpen && (
            <CreateProjectModal
              isOpen={isCreateModalOpen}
              onClose={() => {
                setIsCreateModalOpen(false);
                // Refresh glossary list if we're on that tab
                if (selectedTab === 'glossary') {
                  setGlossaryListKey(prev => prev + 1);
                }
              }}
              defaultType={selectedTab}
            />
          )}
        </div>
      </div>
    </>
  );
};

