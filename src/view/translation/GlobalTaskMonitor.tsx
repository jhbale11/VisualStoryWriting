import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Tooltip,
} from '@nextui-org/react';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { taskRunner } from '../../translation/services/TaskRunner';

/**
 * Global Task Monitor
 * 
 * This component displays active tasks and allows users to monitor and cancel them
 * from any page in the application. It's designed to be mounted at the app level
 * so tasks continue running in the background regardless of page navigation.
 */
export const GlobalTaskMonitor: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const tasks = useTranslationStore(state => Object.values(state.tasks));
  const projects = useTranslationStore(state => state.projects);
  const updateTask = useTranslationStore(state => state.updateTask);

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
      case 'glossary': return '📚 Glossary';
      case 'glossary_extraction': return '📖 Glossary Build';
      case 'translation': return '🌐 Translation';
      case 'retranslate': return '🔄 Retranslate';
      case 'review': return '✅ Review';
      default: return type;
    }
  };

  const handleCancelTask = (taskId: string) => {
    if (confirm('Are you sure you want to cancel this task?')) {
      taskRunner.cancelTask(taskId);
    }
  };

  // Don't render if no active tasks
  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed right-0 top-0 h-screen transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-96'
      }`}
      style={{ zIndex: 9998 }} // High z-index to appear above most content but below modals
    >
      <div className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="animate-pulse">🔄</span>
                Active Tasks
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''} running
              </p>
            </div>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            {isCollapsed ? '◀' : '▶'}
          </Button>
        </div>

        {/* Task List (Expanded) */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTasks.map(task => (
              <Card 
                key={task.id} 
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700"
              >
                <CardHeader className="pb-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
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
                    <div className="flex items-center gap-2">
                      <Progress
                        value={task.progress * 100}
                        color={task.status === 'running' ? 'primary' : 'default'}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                        {Math.round(task.progress * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {task.message}
                    </p>
                    {task.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                        ⚠️ {task.error}
                      </p>
                    )}
                    {task.status === 'running' && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        fullWidth
                        onPress={() => handleCancelTask(task.id)}
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
          <div className="flex-1 flex flex-col items-center justify-start pt-6 p-2 space-y-4">
            {activeTasks.slice(0, 5).map(task => (
              <Tooltip
                key={task.id}
                content={
                  <div className="p-2">
                    <div className="font-semibold">{getTaskTypeLabel(task.type)}</div>
                    <div className="text-xs text-gray-400">{getProjectName(task.projectId)}</div>
                    <div className="text-xs mt-1">{Math.round(task.progress * 100)}%</div>
                  </div>
                }
                placement="left"
              >
                <div className="relative cursor-pointer">
                  <div
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                      task.status === 'running'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">
                      {task.type === 'glossary' ? '📚' : 
                       task.type === 'glossary_extraction' ? '📖' :
                       task.type === 'retranslate' ? '🔄' : '🌐'}
                    </span>
                  </div>
                  {/* Progress ring */}
                  <svg 
                    className="absolute top-0 left-0 w-12 h-12 -rotate-90"
                    viewBox="0 0 48 48"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${task.progress * 125.6} 125.6`}
                      className="text-blue-500"
                    />
                  </svg>
                  {/* Percentage badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                      {Math.round(task.progress * 100)}
                    </span>
                  </div>
                </div>
              </Tooltip>
            ))}
            {activeTasks.length > 5 && (
              <div className="text-xs text-gray-500 font-semibold">
                +{activeTasks.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

