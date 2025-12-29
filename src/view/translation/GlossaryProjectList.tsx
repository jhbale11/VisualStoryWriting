import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { glossaryProjectStorage } from '../../glossary/services/GlossaryProjectStorage';
import type { GlossaryProjectRecord } from '../../glossary/types';

interface GlossaryProjectListProps {
  onProjectsChanged?: (projects: GlossaryProjectRecord[]) => void;
}

export const GlossaryProjectList: React.FC<GlossaryProjectListProps> = ({ onProjectsChanged }) => {
  const [projects, setProjects] = useState<GlossaryProjectRecord[]>([]);
  const tasks = useTranslationStore(state => state.tasks);

  const updateState = useCallback((list: GlossaryProjectRecord[]) => {
    setProjects(list);
    onProjectsChanged?.(list);
  }, [onProjectsChanged]);

  const loadProjects = useCallback(async () => {
    try {
      const list = await glossaryProjectStorage.listProjects();
      updateState(list);
    } catch (error) {
      console.error('[GlossaryProjectList] Failed to load projects', error);
      updateState([]);
    }
  }, [updateState]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-refresh when glossary extraction tasks complete
  useEffect(() => {
    const glossaryTasks = Object.values(tasks).filter(
      t => t.type === 'glossary_extraction' || t.type === 'glossary_reconsolidation'
    );
    const hasCompletedTask = glossaryTasks.some(t => t.status === 'completed');

    if (hasCompletedTask) {
      loadProjects();
    }
  }, [tasks, loadProjects]);

  const openProject = (projectId: string) => {
    // Go to setup screen first (progress + raw chunks), then user can open the full interface.
    localStorage.setItem('vsw.currentProjectId', projectId);
    window.location.hash = `/glossary-project/${projectId}`;
  };

  const deleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    glossaryProjectStorage.deleteProject(projectId)
      .then(() => loadProjects())
      .catch(error => console.error('[GlossaryProjectList] Failed to delete project', error));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getProjectStats = (project: GlossaryProjectRecord) => {
    const chars = project.glossary?.characters?.length || 0;
    const events = project.glossary?.events?.length || 0;
    const locations = project.glossary?.locations?.length || 0;
    const terms = project.glossary?.terms?.length || 0;
    const hasText = (project.glossary?.fullText?.length || 0) > 0;

    return { chars, events, locations, terms, hasText };
  };

  const getProjectTask = (projectId: string) => {
    const projectTasks = Object.values(tasks).filter(
      t => t.type === 'glossary_extraction' && t.metadata?.vswProjectId === projectId
    );
    // Return the most recent task
    return projectTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const stats = getProjectStats(project);
        const task = getProjectTask(project.id);

        return (
          <Card
            key={project.id}
            isPressable
            isHoverable
            className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow"
            onPress={() => openProject(project.id)}
          >
            <CardHeader className="flex-col items-start gap-2">
              <div className="flex justify-between items-start w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    {task && (task.status === 'running' || task.status === 'pending') && (
                      <Chip size="sm" color="warning" variant="flat">
                        Processing...
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Updated: {formatDate(project.updatedAt)}
                  </p>
                  {task && (task.status === 'running' || task.status === 'pending') && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {Math.round(task.progress * 100)}% - {task.message}
                    </p>
                  )}
                </div>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                >
                  🗑️
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {stats.chars > 0 && (
                    <Chip size="sm" color="primary" variant="flat">
                      {stats.chars} Characters
                    </Chip>
                  )}
                  {stats.events > 0 && (
                    <Chip size="sm" color="secondary" variant="flat">
                      {stats.events} Events
                    </Chip>
                  )}
                  {stats.locations > 0 && (
                    <Chip size="sm" color="success" variant="flat">
                      {stats.locations} Locations
                    </Chip>
                  )}
                  {stats.terms > 0 && (
                    <Chip size="sm" color="warning" variant="flat">
                      {stats.terms} Terms
                    </Chip>
                  )}
                </div>

                {!stats.hasText && stats.chars === 0 && stats.events === 0 ? (
                  <p className="text-sm text-gray-400 italic">Empty project</p>
                ) : stats.hasText ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📄 {Math.round((project.glossary?.fullText?.length || 0) / 1000)}k characters
                  </p>
                ) : null}

                <div className="pt-2">
                  <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    fullWidth
                    onPress={() => openProject(project.id)}
                  >
                    Open in Builder →
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

