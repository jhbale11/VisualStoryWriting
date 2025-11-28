import { Button, Card, CardBody, CardHeader, Divider, Progress, Select, SelectItem } from "@nextui-org/react";
import { useState, useEffect } from "react";
import { FiUpload } from "react-icons/fi";
import { useTranslationStore } from '../translation/store/TranslationStore';
import { taskRunner } from '../translation/services/TaskRunner';
import { glossaryProjectStorage } from '../glossary/services/GlossaryProjectStorage';
import type { GlossaryProjectRecord } from '../glossary/types';

export default function GlossaryUploader() {
  const [file, setFile] = useState<File | null>(null);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'ja'>('en');
  const [taskId, setTaskId] = useState<string | null>(null);
  
  const { createTask, tasks } = useTranslationStore();
  const currentTask = taskId ? tasks[taskId] : undefined;
  const isProcessing = currentTask?.status === 'running';
  const progress = currentTask?.progress || 0;

  // Monitor task completion
  useEffect(() => {
    if (currentTask && currentTask.status === 'completed') {
      setTimeout(() => {
        window.location.hash = '/glossary-builder';
      }, 500);
    }
  }, [currentTask]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/plain") {
      setFile(selectedFile);
    } else {
      alert("Please upload a .txt file");
    }
  };

  const processText = async () => {
    if (!file) return;

    if (!apiKey) {
      alert('API Key not found. Please add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      // Generate project ID
      const vswProjectId = (globalThis.crypto && 'randomUUID' in globalThis.crypto 
        ? crypto.randomUUID() 
        : `p-${Date.now()}`);
      
      const projectName = file?.name 
        ? `${file.name.replace(/\.[^/.]+$/, '')} (${new Date().toLocaleString()})` 
        : `Glossary Project ${new Date().toLocaleString()}`;
      
      // Create placeholder project
      const placeholderProject: GlossaryProjectRecord = {
        id: vswProjectId,
        name: projectName,
        updatedAt: Date.now(),
        status: 'processing',
      };
      await glossaryProjectStorage.saveProject(placeholderProject);
      
      // Create task
      const newTaskId = createTask({
        type: 'glossary_extraction',
        projectId: vswProjectId, // Use dummy projectId for glossary tasks
        metadata: {
          text,
          targetLanguage,
          vswProjectId,
        },
      });
      
      setTaskId(newTaskId);
      
      // Start task in background
      taskRunner.runTask(newTaskId).catch(error => {
        console.error('Error running glossary extraction:', error);
        alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    };

    reader.readAsText(file);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      
      <Card style={{ width: '500px', padding: '20px' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUpload size={24} />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Upload Novel for Glossary Analysis</span>
          </div>
        </CardHeader>
        <Divider />
        <CardBody style={{ gap: '20px' }}>
          <p style={{ color: '#666' }}>
            Upload a text file to automatically extract characters, events, and relationships.
            The system will build a comprehensive glossary with visual representations.
          </p>

          {!apiKey && (
            <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#856404', margin: 0 }}>
                ⚠️ API Key not found. Please create a <code>.env</code> file with <code>VITE_GEMINI_API_KEY</code>.
                <br />
                Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
              </p>
            </div>
          )}

          <div>
            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
              Target Language (번역 목표 언어)
            </label>
            <Select
              placeholder="Select a language"
              selectedKeys={[targetLanguage]}
              onChange={(e) => setTargetLanguage(e.target.value as 'en' | 'ja')}
            >
              <SelectItem key="en" value="en">
                English (영어)
              </SelectItem>
              <SelectItem key="ja" value="ja">
                Japanese (日本語)
              </SelectItem>
            </Select>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              Korean names will be kept, but all other fields will be in the selected language
            </p>
          </div>

          <div>
            <label
              htmlFor="file-upload"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                border: '2px dashed #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: file ? '#f0f9ff' : '#fafafa'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.background = '#f0f9ff';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.background = '#fafafa';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile && droppedFile.type === "text/plain") {
                  setFile(droppedFile);
                }
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.background = '#fafafa';
              }}
            >
              <FiUpload size={40} color="#667eea" />
              <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p style={{ fontSize: '12px', color: '#888' }}>
                TXT files only
              </p>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {isProcessing && currentTask && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  {currentTask.message}
                </span>
                <Progress
                  value={progress * 100}
                  color="secondary"
                  size="md"
                  showValueLabel={true}
                  className="max-w-full"
                />
              </div>
              <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                Processing in background. You can navigate away and check progress in the top-right corner.
              </p>
            </div>
          )}

          <Button
            color="secondary"
            size="lg"
            onClick={processText}
            isDisabled={!file || isProcessing || !apiKey}
            isLoading={isProcessing}
            style={{ width: '100%' }}
          >
            {isProcessing ? 'Processing...' : 'Build Glossary'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
