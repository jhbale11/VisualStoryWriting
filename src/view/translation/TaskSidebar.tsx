import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Divider,
  Tooltip,
} from '@nextui-org/react';
import { useTranslationStore } from '../../translation/store/TranslationStore';

export const TaskSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const tasks = useTranslationStore(state => Object.values(state.tasks));
  const projects = useTranslationStore(state => state.projects);
  const cancelTask = useTranslationStore(state => state.cancelTask);

  // Filter active tasks (not completed, failed, or cancelled)
  const activeTasks = tasks.filter(
    task => task.status === 'running' || task.status === 'pending'
  );

  // Get project name for task
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Get status color
  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "danger" => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'cancelled': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  // Get task type label
  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'glossary': return '📚 Glossary Extraction';
      case 'translation': return '🌐 Translation';
      case 'retranslate': return '🔄 Re-translation';
      case 'review': return '✅ Review';
      default: return type;
    }
  };

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed right-0 top-0 h-screen transition-all duration-300 ease-in-out z-50 ${
        isCollapsed ? 'w-16' : 'w-96'
      }`}
    >
      <div className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold">Active Tasks</h2>
              <p className="text-xs text-gray-500">{activeTasks.length} running</p>
            </div>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? '◀' : '▶'}
          </Button>
        </div>

        {/* Task List */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTasks.map(task => (
              <Card key={task.id} className="bg-gray-50 dark:bg-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">
                        {getTaskTypeLabel(task.type)}
                      </span>
                      <Chip
                        size="sm"
                        color={getStatusColor(task.status)}
                        variant="flat"
                      >
                        {task.status}
                      </Chip>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getProjectName(task.projectId)}
                    </p>
                  </div>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="space-y-2">
                    <Progress
                      value={task.progress}
                      color={task.status === 'running' ? 'primary' : 'default'}
                      size="sm"
                      className="mb-2"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {task.message}
                    </p>
                    {task.status === 'running' && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        fullWidth
                        onPress={() => {
                          if (confirm('Are you sure you want to cancel this task?')) {
                            cancelTask(task.id);
                          }
                        }}
                      >
                        🛑 Cancel Task
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Collapsed View */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-4">
            {activeTasks.slice(0, 3).map(task => (
              <Tooltip
                key={task.id}
                content={`${getTaskTypeLabel(task.type)} - ${task.progress}%`}
                placement="left"
              >
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                      task.status === 'running'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">
                      {task.type === 'glossary' ? '📚' : '🌐'}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-white dark:bg-gray-900 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {Math.round(task.progress)}
                    </span>
                  </div>
                </div>
              </Tooltip>
            ))}
            {activeTasks.length > 3 && (
              <div className="text-xs text-gray-500">
                +{activeTasks.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

