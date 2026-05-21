import React from 'react';
import '@fontsource/inter/latin.css';
import './i18n.js';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { UiSettingsProvider } from './context/UiSettingsContext.jsx';
import './styles/global.css';
import './polygraphy/components/OnlineEditorModal.css';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
      <QueryClientProvider client={queryClient}>
      <UiSettingsProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
              },
            }}
          />
          <App />
        </BrowserRouter>
      </UiSettingsProvider>
    </QueryClientProvider>
);
