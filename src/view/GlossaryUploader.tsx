import { Button, Card, CardBody, CardHeader, Divider, Progress, Select, SelectItem } from "@nextui-org/react";
import { useState } from "react";
import { FiUpload } from "react-icons/fi";
import { initGemini, useGlossaryStore } from '../model/GlossaryModel';

export default function GlossaryUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const defaultKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const [accessKey, setAccessKey] = useState(defaultKey);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunksState] = useState(0);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'ja'>('en');

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

    const keyToUse = accessKey || defaultKey;
    initGemini(keyToUse);

    setIsProcessing(true);
    setProgress(0);
    setCurrentChunk(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;

      const chunkSize = 10000;
      const chunks: string[] = [];

      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }

      setTotalChunksState(chunks.length);

      useGlossaryStore.getState().reset();
      useGlossaryStore.getState().setTargetLanguage(targetLanguage);
      // Also reset the editing model to avoid stale demo content bleeding into view
      try {
        const { useModelStore } = await import('../model/Model');
        useModelStore.getState().reset();
      } catch {}
      useGlossaryStore.getState().setFullText(text);
      useGlossaryStore.getState().setTotalChunks(chunks.length);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setCurrentChunk(i + 1);
        setProgress(((i + 1) / chunks.length) * 90);

        try {
          await useGlossaryStore.getState().processChunk(chunk, i);
        } catch (error) {
          console.error(`Error processing chunk ${i}:`, error);
        }
      }

      setProgress(95);
      setIsConsolidating(true);

      try {
        await useGlossaryStore.getState().consolidateResults();
      } catch (error) {
        console.error('Error consolidating results:', error);
      }

      setIsConsolidating(false);

      setProgress(100);
      setIsProcessing(false);

      setTimeout(() => {
        try {
          const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto ? crypto.randomUUID() : `p-${Date.now()}`);
          const name = file?.name ? `${file.name.replace(/\.[^/.]+$/, '')} (${new Date().toLocaleString()})` : `Project ${new Date().toLocaleString()}`;
          const raw = localStorage.getItem('vsw.projects') || '[]';
          const arr = JSON.parse(raw);
          const project = {
            id,
            name,
            updatedAt: Date.now(),
            glossary: {
              characters: useGlossaryStore.getState().characters,
              events: useGlossaryStore.getState().events,
              locations: useGlossaryStore.getState().locations,
              terms: useGlossaryStore.getState().terms,
              fullText: useGlossaryStore.getState().fullText,
            },
            view: {
              entityNodes: [],
              actionEdges: [],
              locationNodes: [],
              textState: [],
              isReadOnly: false,
              relationsPositions: {}
            }
          } as any;
          const next = [project, ...arr];
          localStorage.setItem('vsw.projects', JSON.stringify(next));
          localStorage.setItem('vsw.currentProjectId', id);
        } catch {}
        window.location.hash = '/glossary-builder' + `?k=${btoa(keyToUse)}`;
      }, 500);
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

          <div>
            <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
              Gemini API Key
            </label>
            <input
              type="text"
              placeholder="AIza..."
              value={accessKey}
              onChange={(e) => {
                setAccessKey(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
              {defaultKey && <span> · Using default key unless overridden</span>}
            </p>
          </div>

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

          {isProcessing && (
            <div>
              <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                {isConsolidating
                  ? 'Consolidating results and selecting major events...'
                  : `Processing chunk ${currentChunk} of ${totalChunks} (${Math.round(progress)}%)`
                }
              </p>
              <Progress value={progress} color="secondary" />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {isConsolidating
                  ? 'Analyzing overall narrative and character development...'
                  : 'This may take several minutes depending on text length...'
                }
              </p>
            </div>
          )}

          <Button
            color="secondary"
            size="lg"
            onClick={processText}
            isDisabled={!file || isProcessing}
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
