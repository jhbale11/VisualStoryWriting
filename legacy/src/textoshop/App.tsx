import { NextUIProvider } from '@nextui-org/react';
import { StrictMode } from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import './App.css';
import BaselineInterface from './study/BaselineInterface';
import StudyInterface from './study/StudyInterface';
import { useStudyStore } from './study/StudyModel';
import Launcher from './view/Launcher';
import TextoshopInterface from './view/TextoshopInterface';
import ProjectList from './review/ProjectList';
import ChunkReview from './review/ChunkReview';



function App() {

  const router = createHashRouter([
    {
      path: 'review',
      element: <ProjectList />
    },
    {
      path: 'review/:projectId',
      element: <ChunkReview />
    },
    {
      path: 'free-form',
      loader: () => {
        useStudyStore.getState().setIsDataSaved(false);
        return null;
      },
      element: <TextoshopInterface />
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
      path: '',
      element: <Launcher />
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
        </NextUIProvider>
      </StrictMode>
    </>
  )
}

export default App
