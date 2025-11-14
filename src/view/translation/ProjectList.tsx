import React from 'react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { Card, CardHeader, CardBody, CardFooter, Chip, Progress, Button } from '@nextui-org/react';
import { FiTrash2, FiEdit } from 'react-icons/fi';

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
  const { projects, selectProject, deleteProject } = useTranslationStore();
  
  // Filter projects by type if specified
  const filteredProjects = filterType 
    ? projects.filter(p => p.type === filterType)
    : projects;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(projectId);
    }
  };

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No projects yet. Create your first {filterType || ''} project!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => (
          <Card
            key={project.id}
            isPressable
            onPress={() => selectProject(project.id)}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="flex justify-between">
              <div className="flex flex-col flex-1">
                <p className="text-lg font-semibold">{project.name}</p>
                <p className="text-sm text-gray-500">
                  {project.type === 'glossary' ? 'Glossary Builder' : 'Translation'}
                </p>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={(e) => handleDelete(project.id, e as any)}
              >
                <FiTrash2 />
              </Button>
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
                  {project.glossary && (
                    <p>
                      Glossary:{' '}
                      {Object.keys(project.glossary.characters).length} characters,{' '}
                      {Object.keys(project.glossary.terms).length} terms
                    </p>
                  )}
                </div>
              </div>
            </CardBody>

            <CardFooter>
              <p className="text-xs text-gray-500">
                Updated: {formatDate(project.updated_at)}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

