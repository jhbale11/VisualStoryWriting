import { NextUIProvider } from '@nextui-org/react';
import { StrictMode } from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import BaselineInterface from './study/BaselineInterface';
import StudyInterface from './study/StudyInterface';
import { useStudyStore } from './study/StudyModel';
import GlossaryBuilder from './view/GlossaryBuilder';
import GlossaryUploader from './view/GlossaryUploader';
import ProjectManager from './view/ProjectManager';
import GlossaryViewer from './view/GlossaryViewer';
import Launcher from './view/Launcher';
import VisualWritingInterface from './view/VisualWritingInterface';
import { TranslationMain } from './view/translation/TranslationMain';
import { GlobalTaskMonitor } from './view/translation/GlobalTaskMonitor';



function App() {

  const router = createHashRouter([
    {
      path: '/',
      element: <TranslationMain />
    },
    {
      path: 'free-form',
      loader: () => {
        useStudyStore.getState().setIsDataSaved(false);
        return null;
      },
      element: <VisualWritingInterface />
    },
    {
      path: 'study',
      element: <StudyInterface />
    },
    {
      path: 'baseline',
      element: <BaselineInterface />
    },
    {
      path: 'glossary-builder',
      element: <GlossaryBuilder />
    },
    {
      path: 'glossary-view',
      element: <GlossaryViewer />
    },
    {
      path: 'launcher',
      element: <Launcher />
    },
    {
      path: 'project-manager',
      element: <ProjectManager />
    },
    {
      path: 'glossary-uploader',
      element: <GlossaryUploader />
    }
  ],
  /*{
    basename: import.meta.env.BASE_URL
  }*/
);

  return (
    <>
      <StrictMode>
        <NextUIProvider>
        <RouterProvider router={router} />
          <GlobalTaskMonitor />
        </NextUIProvider>
      </StrictMode>
    </>
  )
}

export default App
