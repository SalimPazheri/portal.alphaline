import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SystemMessageProvider } from './context/SystemMessageContext'; // <--- Import this

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap the WHOLE App here so everything can access it */}
    <SystemMessageProvider>
      <App />
    </SystemMessageProvider>
  </React.StrictMode>
);