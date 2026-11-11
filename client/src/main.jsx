import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import { ThemeProvider } from './features/theme/ThemeProvider.jsx';
import './index.css';
import { setUpPrinting } from './lib/print.js';
import { setUpPwa } from './lib/pwa.js';
import { queryClient } from './lib/queryClient.js';

setUpPwa();
setUpPrinting();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
