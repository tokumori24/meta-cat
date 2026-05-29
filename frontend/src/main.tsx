import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ROOT_ELEMENT_ID } from './constants.ts';

const rootElement = document.getElementById(ROOT_ELEMENT_ID);

if (rootElement === null) {
  throw new Error(`Root element #${ROOT_ELEMENT_ID} was not found`);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
