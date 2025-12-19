import { NextUIProvider } from '@nextui-org/react';
import { StrictMode } from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import GlossaryBuilder from './view/GlossaryBuilder';
import { TranslationMain } from './view/translation/TranslationMain';
import { GlobalTaskMonitor } from './view/translation/GlobalTaskMonitor';
import { GlossaryProjectSetup } from './view/translation/GlossaryProjectSetup';



function App() {

  const router = createHashRouter([
    {
      path: '/',
      element: <TranslationMain />
    },
    {
      path: 'glossary-project/:projectId',
      element: <GlossaryProjectSetup />
    },
    {
      path: 'glossary-builder',
      element: <GlossaryBuilder />
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
