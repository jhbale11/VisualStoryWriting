import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Divider, Progress, Textarea } from '@nextui-org/react';
import { glossaryProjectStorage } from '../../glossary/services/GlossaryProjectStorage';
import type { GlossaryProjectRecord } from '../../glossary/types';
import { applyViewSnapshot } from '../../glossary/utils/viewSnapshots';
import { restoreGlossarySnapshot, useGlossaryStore } from '../../model/GlossaryModel';
import { useTranslationStore } from '../../translation/store/TranslationStore';
import { taskRunner } from '../../translation/services/TaskRunner';

export const GlossaryProjectSetup: React.FC = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<GlossaryProjectRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tasks = useTranslationStore((s) => Object.values(s.tasks));
  const createTask = useTranslationStore((s) => s.createTask);

  const latestTask = useMemo(() => {
    if (!projectId) return undefined;
    const list = tasks
      .filter((t) => t.type === 'glossary_extraction' && t.metadata?.vswProjectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list[0];
  }, [tasks, projectId]);

  const isRunning = latestTask?.status === 'running' || latestTask?.status === 'pending';

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const record = await glossaryProjectStorage.getProject(projectId);
      if (!record) {
        setError('Project not found');
        setProject(null);
        return;
      }
      setProject(record);
      setError(null);
    } catch (e) {
      console.error('[GlossaryProjectSetup] Failed to load project', e);
      setError(e instanceof Error ? e.message : 'Failed to load project');
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh while processing so raw_chunks stream in as they are saved.
  useEffect(() => {
    if (!projectId) return;
    const needsPolling = project?.status === 'processing';
    if (!needsPolling) return;
    const t = setInterval(() => load(), 1500);
    return () => clearInterval(t);
  }, [projectId, project?.status, load]);

  const rawChunks = useMemo(() => {
    const list = project?.glossary?.raw_chunks || [];
    return [...list].sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
  }, [project?.glossary?.raw_chunks]);

  const processed = project?.processedChunks ?? project?.glossary?.raw_chunks?.length ?? 0;
  const total = project?.totalChunks ?? project?.glossary?.raw_chunks?.length ?? 0;

  const openInterface = async () => {
    if (!projectId) return;
    try {
      const record = await glossaryProjectStorage.getProject(projectId);
      if (record?.glossary) {
        restoreGlossarySnapshot(record.glossary, { fullTextFallback: record.glossary.fullText || '' });
      } else {
        useGlossaryStore.getState().reset();
      }
      applyViewSnapshot(record?.view);
    } catch (e) {
      console.warn('[GlossaryProjectSetup] preload failed (non-fatal)', e);
    }

    localStorage.setItem('vsw.currentProjectId', projectId);
    window.location.hash = '/glossary-builder';
  };

  const resumeExtraction = async () => {
    if (!projectId || isRunning) return;
    // Prefer the last task's metadata (contains the original full text). Fallback to project.glossary.fullText.
    const text =
      (latestTask?.metadata?.text as string | undefined) ||
      (project?.glossary?.fullText as string | undefined) ||
      '';
    const targetLanguage =
      (latestTask?.metadata?.targetLanguage as 'en' | 'ja' | undefined) ||
      (project?.glossary?.target_language as 'en' | 'ja' | undefined) ||
      'en';

    if (!text || !text.trim()) {
      alert('Cannot resume: original text not found. Please restart from the original upload.');
      return;
    }

    const newTaskId = createTask({
      type: 'glossary_extraction',
      projectId,
      metadata: { text, targetLanguage, vswProjectId: projectId },
    });
    taskRunner.runTask(newTaskId).catch((e) => {
      console.error('[GlossaryProjectSetup] resume failed', e);
      alert(`Resume failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xl font-bold">Glossary Project</div>
          <div className="text-sm text-gray-500">{projectId}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="flat" onPress={() => { window.location.hash = '/'; }}>
            ← Back
          </Button>
          <Button color="secondary" onPress={openInterface} isDisabled={!projectId}>
            Open Interface →
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardBody>
            <div className="text-red-600 font-semibold">Error</div>
            <div className="text-sm text-gray-700">{error}</div>
          </CardBody>
        </Card>
      ) : null}

      {project ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="font-semibold">{project.name}</div>
              <div className="text-xs text-gray-500">Updated: {new Date(project.updatedAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Chip size="sm" color={project.status === 'processing' ? 'warning' : 'success'} variant="flat">
                {project.status || 'ready'}
              </Chip>
              <Chip size="sm" variant="flat">
                Chunks: {processed}/{total || '?'}
              </Chip>
              <Chip size="sm" variant="flat">
                Raw: {rawChunks.length}
              </Chip>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="text-sm text-gray-600">
              여기서 extraction 진행상황과 chunk별 raw 결과를 확인한 뒤, <b>Open Interface</b>로 편집/그래프 화면을 여세요.
            </div>
            {latestTask ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-gray-600">
                  Task: <b>{latestTask.status}</b> — {latestTask.message}
                </div>
                <Progress value={(latestTask.progress || 0) * 100} size="sm" />
                {(latestTask.status === 'failed' || latestTask.status === 'cancelled' || latestTask.status === 'completed') && (
                  <Button
                    size="sm"
                    color="warning"
                    variant="flat"
                    onPress={resumeExtraction}
                    isDisabled={isRunning}
                  >
                    Resume / Restart Extraction
                  </Button>
                )}
                {(latestTask.status === 'pending') && (
                  <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    onPress={() => taskRunner.runTask(latestTask.id)}
                  >
                    Start Task
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  size="sm"
                  color="warning"
                  variant="flat"
                  onPress={resumeExtraction}
                  isDisabled={isRunning}
                >
                  Resume / Restart Extraction
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="font-semibold">Chunk Raw Extractions</div>
          <Button size="sm" variant="flat" onPress={load} isDisabled={!projectId}>
            Refresh
          </Button>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-3">
          {rawChunks.length === 0 ? (
            <div className="text-sm text-gray-500">
              아직 raw chunk 데이터가 없습니다. (processing 중이면 곧 들어옵니다)
            </div>
          ) : (
            rawChunks.map((rc) => (
              <Card key={`rc-${rc.chunkIndex}`} className="bg-white">
                <CardHeader>
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold">
                      Chunk #{(rc.chunkIndex ?? 0) + 1}{' '}
                      <span className="text-xs text-gray-500 font-normal">({rc.model})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {rc.extractedAt}
                      {rc.parseError ? <span className="text-red-600 ml-2">ParseError: {rc.parseError}</span> : null}
                    </div>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody className="space-y-3">
                  <Textarea
                    label="Raw JSON"
                    value={JSON.stringify(rc.raw ?? {}, null, 2)}
                    minRows={6}
                    readOnly
                  />
                  {rc.rawText ? (
                    <Textarea
                      label="Raw Text"
                      value={String(rc.rawText)}
                      minRows={4}
                      readOnly
                    />
                  ) : null}
                </CardBody>
              </Card>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
};


