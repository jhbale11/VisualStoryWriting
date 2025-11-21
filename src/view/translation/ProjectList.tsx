import React, { useEffect } from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { Card, CardHeader, CardBody, CardFooter, Chip, Progress, Button, Switch, Divider } from '@nextui-org/react';
import { FiTrash2, FiEdit, FiArchive, FiDownload, FiRotateCcw } from 'react-icons/fi';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  'setup': 'default',
  'glossary_running': 'warning',
  'glossary_completed': 'success',
  'translating': 'warning',
  'translation_completed': 'success',
  'reviewing': 'primary',
  'review_completed': 'success',
};

const statusLabels: Record<string, string> = {
  'setup': 'Setup',
  'glossary_running': 'Building Glossary',
  'glossary_completed': 'Glossary Ready',
  'translating': 'Translating',
  'translation_completed': 'Translation Complete',
  'reviewing': 'Under Review',
  'review_completed': 'Review Complete',
};

interface ProjectListProps {
  filterType?: 'glossary' | 'translation';
}

export const ProjectList: React.FC<ProjectListProps> = ({ filterType }) => {
  const { 
    projects, 
    archivedProjects,
    showArchived,
    toggleShowArchived,
    loadArchivedProjects,
    archiveCompletedProjects,
    restoreProject,
    selectProject, 
    deleteProject,
    exportProject 
  } = useTranslationStore();
  
  // Load archived projects on mount if needed
  useEffect(() => {
    if (showArchived && archivedProjects.length === 0) {
      loadArchivedProjects();
    }
  }, [showArchived, archivedProjects.length, loadArchivedProjects]);
  
  // Combine active and archived projects if showing archived
  const allProjects = showArchived 
    ? [...projects, ...archivedProjects]
    : projects;
  
  // Filter projects by type if specified
  const filteredProjects = filterType 
    ? allProjects.filter(p => p.type === filterType)
    : allProjects;
  
  // Separate active and archived for display
  const activeFilteredProjects = filteredProjects.filter(p => 
    projects.some(ap => ap.id === p.id)
  );
  const archivedFilteredProjects = filteredProjects.filter(p => 
    archivedProjects.some(ap => ap.id === p.id)
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDelete = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId) || 
                    archivedProjects.find(p => p.id === projectId);
    const projectName = project?.name || projectId;
    
    if (confirm(`Are you sure you want to delete "${projectName}"?\n\nThis will remove the project from both IndexedDB and LocalStorage.`)) {
      try {
        console.log(`[ProjectList] Deleting project: ${projectName} (${projectId})`);
        deleteProject(projectId);
        
        // Give a small delay to ensure deletion completes
        setTimeout(() => {
          console.log(`[ProjectList] Project ${projectName} deleted successfully`);
        }, 100);
      } catch (error) {
        console.error(`[ProjectList] Failed to delete project:`, error);
        alert(`Failed to delete project: ${error}`);
      }
    }
  };
  
  const handleArchive = () => {
    if (confirm('Archive all completed projects? This will move them to database storage.')) {
      archiveCompletedProjects();
    }
  };
  
  const handleRestore = (projectId: string) => {
    if (confirm('Restore this project to active projects?')) {
      restoreProject(projectId);
    }
  };
  
  const handleExport = async (projectId: string, projectName: string) => {
    try {
      await exportProject(projectId);
      // File will be downloaded automatically by the browser
    } catch (error) {
      alert(`Failed to export project: ${error}`);
    }
  };

  const renderProject = (project: any, isArchived: boolean) => (
    <Card
      key={project.id}
      isPressable
      onPress={() => selectProject(project.id)}
      className={`hover:shadow-lg transition-shadow ${isArchived ? 'opacity-75' : ''}`}
    >
      <CardHeader className="flex justify-between">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{project.name}</p>
            {isArchived && (
              <Chip size="sm" color="default" variant="flat">
                <FiArchive className="inline mr-1" />
                Archived
              </Chip>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {project.type === 'glossary' ? 'Glossary Builder' : 'Translation'}
          </p>
        </div>
        <div className="flex gap-1">
          {!isArchived && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="secondary"
              onPress={() => handleExport(project.id, project.name)}
              title="Export to JSON"
            >
              <FiDownload />
            </Button>
          )}
          {isArchived && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="primary"
              onPress={() => handleRestore(project.id)}
              title="Restore project"
            >
              <FiRotateCcw />
            </Button>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={() => handleDelete(project.id)}
          >
            <FiTrash2 />
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        <div className="space-y-3">
          <Chip
            color={statusColors[project.status] || 'default'}
            size="sm"
            variant="flat"
          >
            {statusLabels[project.status] || project.status}
          </Chip>

          {project.type === 'translation' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(project.translation_progress * 100)}%</span>
              </div>
              <Progress
                value={project.translation_progress * 100}
                color={project.translation_progress === 1 ? 'success' : 'primary'}
                size="sm"
              />
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Chunks: {project.chunks.length}</p>
            <p>Language: {project.language === 'ja' ? 'Japanese' : 'English'}</p>
            {project.glossary && (() => {
              // Handle both old and new glossary formats
              let arcsCount = 0;
              let charactersCount = 0;
              let eventsCount = 0;
              let termsCount = 0;
              
              if (project.glossary.arcs && Array.isArray(project.glossary.arcs)) {
                // New arc-based format
                arcsCount = project.glossary.arcs.length;
                
                // Extract unique characters across all arcs
                const uniqueCharIds = new Set<string>();
                const uniqueEventIds = new Set<string>();
                const uniqueTermIds = new Set<string>();
                
                project.glossary.arcs.forEach((arc: any) => {
                  (arc.characters || []).forEach((char: any) => {
                    uniqueCharIds.add(char.id || char.name);
                  });
                  (arc.events || []).forEach((event: any) => {
                    uniqueEventIds.add(event.id || event.name);
                  });
                  (arc.terms || []).forEach((term: any) => {
                    uniqueTermIds.add(term.id || term.original);
                  });
                });
                
                charactersCount = uniqueCharIds.size;
                eventsCount = uniqueEventIds.size;
                termsCount = uniqueTermIds.size;
              } else {
                // Old format (fallback)
                charactersCount = Object.keys(project.glossary.characters || {}).length;
                termsCount = Object.keys(project.glossary.terms || {}).length;
              }
              
              return (
                <div className="space-y-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {arcsCount > 0 && (
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-primary">📖 {arcsCount}</span>
                      <span className="text-xs">story arcs</span>
                    </p>
                  )}
                  {charactersCount > 0 && (
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-secondary">👥 {charactersCount}</span>
                      <span className="text-xs">characters</span>
                    </p>
                  )}
                  {eventsCount > 0 && (
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-warning">⚡ {eventsCount}</span>
                      <span className="text-xs">events</span>
                    </p>
                  )}
                  {termsCount > 0 && (
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-success">📝 {termsCount}</span>
                      <span className="text-xs">terms</span>
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </CardBody>

      <CardFooter>
        <p className="text-xs text-gray-500">
          Updated: {formatDate(project.updated_at)}
        </p>
      </CardFooter>
    </Card>
  );
  
  const hasCompletedProjects = projects.some(p => 
    ['glossary_completed', 'translation_completed', 'review_completed'].includes(p.status)
  );

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-4">
          <Switch
            isSelected={showArchived}
            onValueChange={toggleShowArchived}
            size="sm"
          >
            Show Archived ({archivedProjects.length})
          </Switch>
          
          {hasCompletedProjects && (
            <Button
              size="sm"
              color="secondary"
              variant="flat"
              startContent={<FiArchive />}
              onPress={handleArchive}
            >
              Archive Completed
            </Button>
          )}
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {activeFilteredProjects.length} active
          {showArchived && ` • ${archivedFilteredProjects.length} archived`}
        </div>
      </div>
      
      {/* Active Projects */}
      {activeFilteredProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Active Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeFilteredProjects.map(project => renderProject(project, false))}
          </div>
        </div>
      )}
      
      {/* Archived Projects */}
      {showArchived && archivedFilteredProjects.length > 0 && (
        <div>
          <Divider className="my-6" />
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FiArchive />
            Archived Projects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedFilteredProjects.map(project => renderProject(project, true))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {activeFilteredProjects.length === 0 && archivedFilteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No projects yet. Create your first {filterType || ''} project!
          </p>
        </div>
      )}
    </div>
  );
};

;

