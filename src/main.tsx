import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SnackbarProvider } from './components/Snackbar';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SnackbarProvider>
      <App />
    </SnackbarProvider>
  </BrowserRouter>,
);
