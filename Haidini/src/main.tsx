import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './nodes.css';
import './motion.css';
import './studio.css';
import './theme.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
